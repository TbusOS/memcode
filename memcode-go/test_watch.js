#!/usr/bin/env node
/**
 * Test file watching functionality
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CODE_PATH = path.join(__dirname, 'fixtures/sample-project/src');
const MEMCODE_BIN = path.join(__dirname, 'memcode');

let server = null;
let messageId = 1;

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    const id = messageId++;
    const fullMsg = { ...msg, id };

    server.stdin.write(JSON.stringify(fullMsg) + '\n');

    const handleData = (data) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id === id) {
            server.stdout.off('data', handleData);
            resolve(response);
            return;
          }
        } catch (e) {
          // Continue parsing
        }
      }
    };

    server.stdout.on('data', handleData);
    setTimeout(() => reject(new Error('Timeout')), 5000);
  });
}

async function runTest() {
  console.log('=== File Watching Test ===\n');

  // Start the server with watch enabled
  console.log('1. Starting MCP server with watch...');
  server = spawn(MEMCODE_BIN, ['--path', CODE_PATH, '--watch'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  server.stdout.on('data', (data) => {
    console.log('Server:', data.toString().trim());
  });

  // Wait for server to initialize
  await new Promise(r => setTimeout(r, 2000));

  if (!server.pid) {
    console.error('Failed to start server');
    process.exit(1);
  }

  console.log('   Server started\n');

  try {
    // Test 1: Read initial content
    console.log('2. Reading initial content of index.ts...');
    const readResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_read', arguments: { path: 'index.ts' } }
    });
    const initialContent = readResult.result.content[0].text;
    console.log(`   ✓ Initial content: ${initialContent.substring(0, 50)}...`);

    // Test 2: Modify file
    console.log('3. Modifying index.ts...');
    const testFile = path.join(CODE_PATH, 'index.ts');
    const originalContent = fs.readFileSync(testFile, 'utf-8');
    fs.writeFileSync(testFile, '// Modified by test\n' + originalContent);

    // Wait for file watcher to detect change
    await new Promise(r => setTimeout(r, 1000));

    // Test 3: Read modified content from memory
    console.log('4. Reading modified content from memory...');
    const modifiedResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_read', arguments: { path: 'index.ts' } }
    });
    const modifiedContent = modifiedResult.result.content[0].text;

    if (modifiedContent.startsWith('// Modified by test')) {
      console.log('   ✓ File change detected and memory updated!');
    } else {
      throw new Error('Memory not updated after file change');
    }

    // Restore original content
    fs.writeFileSync(testFile, originalContent);
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n=== File Watching Test passed! ===\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  } finally {
    server.kill();
  }
}

runTest();
