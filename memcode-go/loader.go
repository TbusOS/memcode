package main

import (
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// Stats represents loading statistics
type Stats struct {
	FileCount    int   `json:"fileCount"`
	TotalSize   int64 `json:"totalSize"`
	LoadTime    int64 `json:"loadTime"`
	WatchEnabled bool  `json:"watchEnabled"`
	CodePath    string `json:"codePath"`
}

// Loader represents the in-memory code store
type Loader struct {
	codePath      string
	codebase      map[string]string
	excludeDirs   map[string]bool
	includeExts   map[string]bool
	watchEnabled  bool
	debounceMs    int
	fileCount     int
	totalSize     int64
	loadTime      int64
	watcher       *fsnotify.Watcher
	mu            sync.RWMutex
	stopChan      chan bool
	syncEnabled   bool
	syncInterval  time.Duration
	lastSync     time.Time
}

// NewLoader creates a new code loader
func NewLoader(config Config) *Loader {
	excludeMap := make(map[string]bool)
	for _, dir := range config.ExcludeDirs {
		excludeMap[dir] = true
	}

	extMap := make(map[string]bool)
	for _, ext := range config.IncludeExts {
		extMap[ext] = true
	}

	return &Loader{
		codePath:     config.CodePath,
		codebase:    make(map[string]string),
		excludeDirs: excludeMap,
		includeExts: extMap,
		watchEnabled: config.WatchEnabled,
		debounceMs:  config.DebounceMs,
	}
}

// Load loads all code files into memory
func (l *Loader) Load() Stats {
	startTime := time.Now()

	l.codebase = make(map[string]string)
	l.fileCount = 0
	l.totalSize = 0

	l.walkDirectory(l.codePath)

	l.loadTime = time.Since(startTime).Milliseconds()

	// Start file watching if enabled
	if l.watchEnabled {
		go l.startWatching()
	}

	return l.GetStats()
}

// walkDirectory recursively walks the directory and loads files
func (l *Loader) walkDirectory(dirPath string) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return
	}

	for _, entry := range entries {
		fullPath := filepath.Join(dirPath, entry.Name())

		if entry.IsDir() {
			// Skip excluded directories
			if l.excludeDirs[entry.Name()] {
				continue
			}
			l.walkDirectory(fullPath)
		} else {
			// Check if file should be included
			ext := filepath.Ext(entry.Name())
			if l.includeExts[ext] {
				l.loadFile(fullPath)
			}
		}
	}
}

// loadFile loads a single file into memory
func (l *Loader) loadFile(filePath string) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return
	}

	relativePath, err := filepath.Rel(l.codePath, filePath)
	if err != nil {
		return
	}

	l.codebase[relativePath] = string(content)
	l.fileCount++
	l.totalSize += int64(len(content))
}

// Read reads a file from memory
func (l *Loader) Read(path string) string {
	// Try direct match first
	if content, ok := l.codebase[path]; ok {
		return content
	}

	// Try as relative path
	relativePath, err := filepath.Rel(l.codePath, path)
	if err != nil {
		return ""
	}

	if content, ok := l.codebase[relativePath]; ok {
		return content
	}

	return ""
}

// Grep searches for a pattern in the code
func (l *Loader) Grep(pattern string, filePath string) []map[string]interface{} {
	var results []map[string]interface{}

	regex, err := regexp.Compile(pattern)
	if err != nil {
		return results
	}

	filesToSearch := l.codebase
	if filePath != "" {
		if content, ok := l.codebase[filePath]; ok {
			filesToSearch = map[string]string{filePath: content}
		} else {
			return results
		}
	}

	for filename, content := range filesToSearch {
		lines := strings.Split(content, "\n")
		for i, line := range lines {
			if regex.MatchString(line) {
				results = append(results, map[string]interface{}{
					"file":   filename,
					"line":    i + 1,
					"content": strings.TrimRight(line, "\r"),
				})
			}
		}
	}

	return results
}

// Glob finds files matching a pattern
func (l *Loader) Glob(pattern string) []string {
	// Convert glob pattern to regex
	regexPattern := strings.ReplaceAll(pattern, ".", "\\.")
	regexPattern = strings.ReplaceAll(regexPattern, "**", ".*")
	regexPattern = strings.ReplaceAll(regexPattern, "*", "[^/]*")
	regexPattern = strings.ReplaceAll(regexPattern, "?", "[^/]")
	regexPattern = "^" + regexPattern + "$"

	regex, err := regexp.Compile(regexPattern)
	if err != nil {
		return nil
	}

	var results []string
	for file := range l.codebase {
		if regex.MatchString(file) {
			results = append(results, file)
		}
	}

	sort.Strings(results)
	return results
}

// GetStats returns loading statistics
func (l *Loader) GetStats() Stats {
	return Stats{
		FileCount:    l.fileCount,
		TotalSize:   l.totalSize,
		LoadTime:    l.loadTime,
		WatchEnabled: l.watchEnabled,
		CodePath:    l.codePath,
	}
}

// ShouldInclude checks if a file should be included
func (l *Loader) ShouldInclude(filePath string) bool {
	relativePath, err := filepath.Rel(l.codePath, filePath)
	if err != nil {
		return false
	}

	parts := strings.Split(relativePath, string(filepath.Separator))
	for _, part := range parts {
		if l.excludeDirs[part] {
			return false
		}
	}

	ext := filepath.Ext(filePath)
	return l.includeExts[ext]
}

// startWatching starts file watching for live reload
func (l *Loader) startWatching() {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return
	}
	l.watcher = watcher
	l.stopChan = make(chan bool)

	// Debounce map
	debounceTimers := make(map[string]*time.Timer)
	var debounceMu sync.Mutex

	go func() {
		for {
			select {
			case <-l.stopChan:
				watcher.Close()
				return
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				// Skip events in excluded directories
				if l.shouldSkipPath(event.Name) {
					continue
				}

				// Get file extension
				ext := filepath.Ext(event.Name)
				if !l.includeExts[ext] {
					continue
				}

				// Debounce
				debounceMu.Lock()
				if timer, exists := debounceTimers[event.Name]; exists {
					timer.Stop()
				}
				debounceTimers[event.Name] = time.AfterFunc(time.Duration(l.debounceMs)*time.Millisecond, func() {
					l.handleFileEvent(event)
					debounceMu.Lock()
					delete(debounceTimers, event.Name)
					debounceMu.Unlock()
				})
				debounceMu.Unlock()
			case err, ok := <-watcher.Errors:
				if !ok || err != nil {
					return
				}
			}
		}
	}()

	// Watch the code directory recursively
	filepath.Walk(l.codePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			watcher.Add(path)
		}
		return nil
	})
}

// handleFileEvent handles file system events
func (l *Loader) handleFileEvent(event fsnotify.Event) {
	relativePath, err := filepath.Rel(l.codePath, event.Name)
	if err != nil {
		return
	}

	switch event.Op {
	case fsnotify.Create:
		l.addFile(relativePath)
	case fsnotify.Write:
		l.reloadFile(relativePath)
	case fsnotify.Remove:
		l.removeFile(relativePath)
	case fsnotify.Rename:
		// Treat rename as remove + add
		l.removeFile(relativePath)
	}
}

// shouldSkipPath checks if path should be skipped (excluded directories)
func (l *Loader) shouldSkipPath(filePath string) bool {
	relativePath, err := filepath.Rel(l.codePath, filePath)
	if err != nil {
		return true
	}

	parts := strings.Split(relativePath, string(filepath.Separator))
	for _, part := range parts {
		if l.excludeDirs[part] || strings.HasPrefix(part, ".") {
			return true
		}
	}
	return false
}

// addFile adds a new file to memory
func (l *Loader) addFile(relativePath string) {
	fullPath := filepath.Join(l.codePath, relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	_, exists := l.codebase[relativePath]
	l.codebase[relativePath] = string(content)
	l.totalSize += int64(len(content))
	if !exists {
		l.fileCount++
	}
}

// reloadFile reloads a file in memory
func (l *Loader) reloadFile(relativePath string) {
	fullPath := filepath.Join(l.codePath, relativePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return
	}

	l.mu.Lock()
	defer l.mu.Unlock()

	oldContent, exists := l.codebase[relativePath]
	if exists {
		l.totalSize -= int64(len(oldContent))
	}
	l.codebase[relativePath] = string(content)
	l.totalSize += int64(len(content))
}

// removeFile removes a file from memory
func (l *Loader) removeFile(relativePath string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	oldContent, exists := l.codebase[relativePath]
	if exists {
		l.totalSize -= int64(len(oldContent))
		delete(l.codebase, relativePath)
		l.fileCount--
	}
}

// StopWatching stops the file watcher
func (l *Loader) StopWatching() {
	if l.stopChan != nil {
		close(l.stopChan)
	}
	if l.watcher != nil {
		l.watcher.Close()
	}
}
