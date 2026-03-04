#!/usr/bin/env node
/**
 * E2E test for memcode Go version
 * Simulates real user usage with MCP protocol
 */

const { spawn } = require('child_process');
const path = require('path');

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
  console.log('=== memcode Go E2E Test ===\n');

  // Start the server
  console.log('1. Starting MCP server...');
  server = spawn(MEMCODE_BIN, ['--path', CODE_PATH], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  server.stdout.on('data', (data) => {
    output += data.toString();
  });
  server.stderr.on('data', (data) => {
    console.error('Server:', data.toString());
  });

  // Wait for server to initialize
  await new Promise(r => setTimeout(r, 2000));

  if (!server.pid) {
    console.error('Failed to start server');
    process.exit(1);
  }

  console.log('   Server started\n');

  try {
    // Test 1: Initialize
    console.log('2. Testing initialize...');
    const initResult = await sendMessage({ jsonrpc: '2.0', method: 'initialize' });
    if (initResult.result && initResult.result.serverInfo) {
      console.log('   ✓ Initialize OK');
    } else {
      throw new Error('Initialize failed');
    }

    // Test 2: List tools
    console.log('3. Testing tools/list...');
    const toolsResult = await sendMessage({ jsonrpc: '2.0', method: 'tools/list' });
    const toolNames = toolsResult.result.tools.map(t => t.name);
    console.log(`   ✓ Found ${toolNames.length} tools: ${toolNames.join(', ')}`);

    // Test 3: memory_code_stats
    console.log('4. Testing memory_code_stats...');
    const statsResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_stats', arguments: {} }
    });
    const stats = JSON.parse(statsResult.result.content[0].text);
    console.log(`   ✓ Loaded ${stats.fileCount} files, ${Math.round(stats.totalSize/1024)}KB`);

    // Test 4: memory_code_read
    console.log('5. Testing memory_code_read...');
    const readResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_read', arguments: { path: 'index.ts' } }
    });
    const content = readResult.result.content[0].text;
    if (content.includes('greeting')) {
      console.log('   ✓ Read index.ts successfully');
    } else {
      throw new Error('Read failed: ' + content.substring(0, 100));
    }

    // Test 5: memory_code_grep
    console.log('6. Testing memory_code_grep...');
    const grepResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_grep', arguments: { pattern: 'export' } }
    });
    const grepResults = JSON.parse(grepResult.result.content[0].text);
    console.log(`   ✓ Found ${grepResults.length} matches for 'export'`);

    // Test 6: memory_code_glob
    console.log('7. Testing memory_code_glob...');
    const globResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_glob', arguments: { pattern: '*.ts' } }
    });
    const globResults = JSON.parse(globResult.result.content[0].text);
    console.log(`   ✓ Found ${globResults.length} .ts files`);

    // Test 7: Error handling - file not found
    console.log('8. Testing error handling...');
    const errorResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_read', arguments: { path: 'nonexistent.ts' } }
    });
    if (errorResult.result.content[0].text.includes('not found')) {
      console.log('   ✓ Error handling OK');
    } else {
      throw new Error('Error handling failed');
    }

    // Test 9: Grep with file filter
    console.log('9. Testing grep with file filter...');
    const grepFilterResult = await sendMessage({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'memory_code_grep', arguments: { pattern: 'export', path: 'constants.ts' } }
    });
    const grepFilter = JSON.parse(grepFilterResult.result.content[0].text);
    console.log(`   ✓ Found ${grepFilter.length} matches in constants.ts`);

    console.log('\n=== All E2E tests passed! ===\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.log('\nServer output:');
    console.log(output);
    process.exit(1);
  } finally {
    server.kill();
  }
}

runTest();
