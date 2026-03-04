package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// Config holds the application configuration
type Config struct {
	CodePath      string
	Port          int
	ExcludeDirs   []string
	IncludeExts   []string
	WatchEnabled  bool
	DebounceMs    int
}

func main() {
	config := parseArgs()

	fmt.Printf("memcode starting...\n")
	fmt.Printf("  Code path: %s\n", config.CodePath)
	fmt.Printf("  Watch: %v\n", config.WatchEnabled)

	loader := NewLoader(config)

	// Load code into memory
	fmt.Printf("\nLoading code into memory...\n")
	stats := loader.Load()

	fmt.Printf("  Files loaded: %d\n", stats.FileCount)
	fmt.Printf("  Total size: %.2f MB\n", float64(stats.TotalSize)/(1024*1024))
	fmt.Printf("  Load time: %dms\n", stats.LoadTime)
	fmt.Printf("  Watch enabled: %v\n", stats.WatchEnabled)

	// Handle shutdown
	// In production, would handle signals here

	// Start MCP server
	fmt.Printf("\nStarting MCP server...\n")
	RunMCPServer(loader)
}

func parseArgs() Config {
	config := Config{
		Port:         8765,
		ExcludeDirs:  []string{".git", "node_modules", "__pycache__", "venv", ".venv"},
		IncludeExts:  []string{".py", ".js", ".ts", ".jsx", ".tsx", ".go", ".java", ".c", ".cpp", ".h", ".rs", ".md", ".json", ".yaml", ".yml"},
		WatchEnabled: true,
		DebounceMs:   500,
	}

	args := os.Args[1:]
	for i := 0; i < len(args); i++ {
		switch args[i] {
		case "--path":
			if i+1 < len(args) {
				config.CodePath = args[i+1]
				i++
			}
		case "--port":
			if i+1 < len(args) {
				fmt.Sscanf(args[i+1], "%d", &config.Port)
				i++
			}
		case "--exclude":
			if i+1 < len(args) {
				config.ExcludeDirs = splitComma(args[i+1])
				i++
			}
		case "--include":
			if i+1 < len(args) {
				config.IncludeExts = splitComma(args[i+1])
				i++
			}
		case "--watch":
			config.WatchEnabled = true
		case "--no-watch":
			config.WatchEnabled = false
		case "--debounce":
			if i+1 < len(args) {
				fmt.Sscanf(args[i+1], "%d", &config.DebounceMs)
				i++
			}
		}
	}

	if config.CodePath == "" {
		fmt.Println("Error: --path is required")
		os.Exit(1)
	}

	// Resolve path
	absPath, err := filepath.Abs(config.CodePath)
	if err != nil {
		fmt.Printf("Error: Invalid path: %v\n", err)
		os.Exit(1)
	}
	config.CodePath = absPath

	return config
}

func splitComma(s string) []string {
	var result []string
	for _, part := range splitAndTrim(s, ",") {
		result = append(result, part)
	}
	return result
}

func splitAndTrim(s, sep string) []string {
	var result []string
	for _, part := range split(s, sep) {
		trimmed := trim(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func split(s, sep string) []string {
	if s == "" {
		return nil
	}
	return splitGeneric(s, sep)
}

func splitGeneric(s, sep string) []string {
	var result []string
	start := 0
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			result = append(result, s[start:i])
			start = i + len(sep)
			i += len(sep) - 1
		}
	}
	result = append(result, s[start:])
	return result
}

func trim(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}
	return s[start:end]
}

type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      interface{}     `json:"id"`
	Method  string         `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *JSONError `json:"error,omitempty"`
}

type JSONError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
}

func RunMCPServer(loader *Loader) {
	decoder := json.NewDecoder(os.Stdin)

	for {
		var req JSONRPCRequest
		if err := decoder.Decode(&req); err != nil {
			break
		}

		resp := handleRequest(req, loader)
		if resp != nil {
			json.NewEncoder(os.Stdout).Encode(resp)
		}
	}
}

func handleRequest(req JSONRPCRequest, loader *Loader) *JSONRPCResponse {
	switch req.Method {
	case "initialize":
		return &JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result: map[string]interface{}{
				"protocolVersion": "2024-11-05",
				"capabilities":   map[string]interface{}{"tools": struct{}{}},
				"serverInfo":     map[string]string{"name": "memcode", "version": "1.0.0"},
			},
		}
	case "tools/list":
		tools := []map[string]interface{}{
			{
				"name":        "memory_code_read",
				"description": "Read file content from memory",
				"inputSchema": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"path": map[string]string{"type": "string", "description": "File path"},
					},
					"required": []string{"path"},
				},
			},
			{
				"name":        "memory_code_grep",
				"description": "Search for pattern in code",
				"inputSchema": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"pattern": map[string]string{"type": "string", "description": "Pattern to search"},
						"path":    map[string]string{"type": "string", "description": "Optional file path"},
					},
					"required": []string{"pattern"},
				},
			},
			{
				"name":        "memory_code_glob",
				"description": "Find files matching pattern",
				"inputSchema": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"pattern": map[string]string{"type": "string", "description": "Glob pattern"},
					},
					"required": []string{"pattern"},
				},
			},
			{
				"name":        "memory_code_stats",
				"description": "Get loading statistics",
				"inputSchema": map[string]interface{}{"type": "object", "properties": map[string]interface{}{}},
			},
		}
		return &JSONRPCResponse{JSONRPC: "2.0", ID: req.ID, Result: map[string]interface{}{"tools": tools}}

	case "tools/call":
		var params map[string]interface{}
		json.Unmarshal(req.Params, &params)
		toolName := params["name"].(string)
		args := params["arguments"].(map[string]interface{})

		var result interface{}
		switch toolName {
		case "memory_code_read":
			path := args["path"].(string)
			content := loader.Read(path)
			if content == "" {
				result = map[string]interface{}{"content": []map[string]string{{"type": "text", "text": "File not found: " + path}}}
			} else {
				result = map[string]interface{}{"content": []map[string]string{{"type": "text", "text": content}}}
			}
		case "memory_code_grep":
			pattern := args["pattern"].(string)
			path := ""
			if p, ok := args["path"].(string); ok {
				path = p
			}
			results := loader.Grep(pattern, path)
			if len(results) == 0 {
				result = map[string]interface{}{"content": []map[string]string{{"type": "text", "text": "No matches found"}}}
			} else {
				resultText, _ := json.Marshal(results)
				result = map[string]interface{}{"content": []map[string]string{{"type": "text", "text": string(resultText)}}}
			}
		case "memory_code_glob":
			pattern := args["pattern"].(string)
			results := loader.Glob(pattern)
			if len(results) == 0 {
				result = map[string]interface{}{"content": []map[string]string{{"type": "text", "text": "No files match"}}}
			} else {
				resultText, _ := json.Marshal(results)
				result = map[string]interface{}{"content": []map[string]string{{"type": "text", "text": string(resultText)}}}
			}
		case "memory_code_stats":
			stats := loader.GetStats()
			resultText, _ := json.Marshal(stats)
			result = map[string]interface{}{"content": []map[string]string{{"type": "text", "text": string(resultText)}}}
		}
		return &JSONRPCResponse{JSONRPC: "2.0", ID: req.ID, Result: result}
	}
	return nil
}
