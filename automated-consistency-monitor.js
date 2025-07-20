#!/usr/bin/env node

/**
 * Automated Proposal Consistency Monitor
 * 
 * This script continuously monitors both proposal rendering components 
 * and automatically detects any future inconsistencies introduced by code changes.
 * 
 * Features:
 * - Watches file changes in real-time
 * - Automatically runs consistency checks
 * - Generates alerts for inconsistencies
 * - Provides specific remediation instructions
 * - Tracks consistency history
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

class AutomatedConsistencyMonitor {
  constructor() {
    this.myTasksPath = path.join(process.cwd(), 'client/src/pages/MyTasks.tsx');
    this.investmentDetailsPath = path.join(process.cwd(), 'client/src/components/details/InvestmentDetailsInline.tsx');
    this.logPath = path.join(process.cwd(), 'consistency-monitor.log');
    this.isMonitoring = false;
    
    // Core fields that must be present in both components
    this.requiredFields = [
      'Request ID',
      'Target Company', 
      'Risk Level',
      'Amount',
      'Expected Return',
      'Status',
      'Investment Type',
      'Created Date',
      'Investment Rationale / Description'
    ];

    // Document components that must be present in both
    this.requiredDocumentComponents = [
      'CrossDocumentQuery',
      'WebSearchQuery', 
      'DocumentAnalysisCard',
      'Documents & AI Analysis'
    ];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    fs.appendFileSync(this.logPath, logEntry);
  }

  checkFieldConsistency() {
    try {
      const myTasksContent = fs.readFileSync(this.myTasksPath, 'utf8');
      const investmentDetailsContent = fs.readFileSync(this.investmentDetailsPath, 'utf8');

      const results = {
        myTasksMissing: [],
        investmentDetailsMissing: [],
        documentComponentIssues: [],
        consistent: true
      };

      // Check required fields in both components
      this.requiredFields.forEach(field => {
        const inMyTasks = myTasksContent.includes(field);
        const inInvestmentDetails = investmentDetailsContent.includes(field);

        if (!inMyTasks) {
          results.myTasksMissing.push(field);
          results.consistent = false;
        }
        if (!inInvestmentDetails) {
          results.investmentDetailsMissing.push(field);
          results.consistent = false;
        }
      });

      // Check document components
      this.requiredDocumentComponents.forEach(component => {
        const inMyTasks = myTasksContent.includes(component);
        const inInvestmentDetails = investmentDetailsContent.includes(component);

        if (inMyTasks !== inInvestmentDetails) {
          results.documentComponentIssues.push({
            component,
            myTasks: inMyTasks,
            investmentDetails: inInvestmentDetails
          });
          results.consistent = false;
        }
      });

      return results;
    } catch (error) {
      this.log(`❌ Error during consistency check: ${error.message}`);
      return { consistent: false, error: error.message };
    }
  }

  generateAlert(results) {
    if (results.consistent) {
      this.log('✅ Proposal rendering components are CONSISTENT');
      return;
    }

    this.log('🚨 CONSISTENCY ALERT - Proposal rendering components have diverged!');
    this.log('=' .repeat(60));

    if (results.myTasksMissing.length > 0) {
      this.log(`❌ MyTasks.tsx is missing ${results.myTasksMissing.length} required fields:`);
      results.myTasksMissing.forEach(field => {
        this.log(`   - ${field}`);
      });
      this.log('\n🔧 ACTION REQUIRED: Add these fields to MyTasks.tsx proposal display section');
    }

    if (results.investmentDetailsMissing.length > 0) {
      this.log(`❌ InvestmentDetailsInline.tsx is missing ${results.investmentDetailsMissing.length} required fields:`);
      results.investmentDetailsMissing.forEach(field => {
        this.log(`   - ${field}`);
      });
      this.log('\n🔧 ACTION REQUIRED: Add these fields to InvestmentDetailsInline.tsx proposal display section');
    }

    if (results.documentComponentIssues.length > 0) {
      this.log(`❌ Document component inconsistencies found:`);
      results.documentComponentIssues.forEach(issue => {
        this.log(`   - ${issue.component}: MyTasks=${issue.myTasks}, InvestmentDetails=${issue.investmentDetails}`);
      });
      this.log('\n🔧 ACTION REQUIRED: Ensure both components have identical document components');
    }

    this.log('\n📋 Quick fix: Run `node proposal-consistency-check.js` for detailed analysis');
    this.log('=' .repeat(60));

    // Generate repair script
    this.generateRepairScript(results);
  }

  generateRepairScript(results) {
    const repairScript = `#!/bin/bash
# Auto-generated repair script for proposal consistency issues
# Generated: ${new Date().toISOString()}

echo "🔧 Repairing proposal rendering consistency issues..."

${results.myTasksMissing.length > 0 ? `
echo "Adding missing fields to MyTasks.tsx:"
${results.myTasksMissing.map(field => `echo "  - ${field}"`).join('\n')}
` : ''}

${results.investmentDetailsMissing.length > 0 ? `
echo "Adding missing fields to InvestmentDetailsInline.tsx:"
${results.investmentDetailsMissing.map(field => `echo "  - ${field}"`).join('\n')}
` : ''}

echo "Run the consistency check again to verify fixes:"
echo "node proposal-consistency-check.js"
`;

    fs.writeFileSync('repair-proposal-consistency.sh', repairScript);
    this.log('📝 Repair script generated: repair-proposal-consistency.sh');
  }

  runSingleCheck() {
    this.log('🔍 Running proposal consistency check...');
    const results = this.checkFieldConsistency();
    this.generateAlert(results);
    
    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      results,
      status: results.consistent ? 'CONSISTENT' : 'INCONSISTENT'
    };
    
    fs.writeFileSync('consistency-check-latest.json', JSON.stringify(reportData, null, 2));
    return results;
  }

  startWatching() {
    if (this.isMonitoring) {
      this.log('⚠️  Monitor is already running');
      return;
    }

    this.log('👀 Starting automated consistency monitoring...');
    this.log(`Watching: ${this.myTasksPath}`);
    this.log(`Watching: ${this.investmentDetailsPath}`);
    
    this.isMonitoring = true;

    // Initial check
    this.runSingleCheck();

    // Watch for file changes
    const watchOptions = { persistent: true };
    
    fs.watchFile(this.myTasksPath, watchOptions, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.log('📝 MyTasks.tsx was modified - running consistency check...');
        setTimeout(() => this.runSingleCheck(), 1000); // Debounce
      }
    });

    fs.watchFile(this.investmentDetailsPath, watchOptions, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        this.log('📝 InvestmentDetailsInline.tsx was modified - running consistency check...');
        setTimeout(() => this.runSingleCheck(), 1000); // Debounce
      }
    });

    this.log('✅ Monitoring started. Press Ctrl+C to stop.');
    
    // Keep the process alive
    process.on('SIGINT', () => {
      this.log('🛑 Stopping consistency monitor...');
      this.isMonitoring = false;
      process.exit(0);
    });
  }

  generateStatus() {
    const results = this.runSingleCheck();
    
    const status = {
      timestamp: new Date().toISOString(),
      overallStatus: results.consistent ? 'CONSISTENT' : 'INCONSISTENT',
      fieldCount: this.requiredFields.length,
      documentComponentCount: this.requiredDocumentComponents.length,
      issues: {
        myTasksMissing: results.myTasksMissing?.length || 0,
        investmentDetailsMissing: results.investmentDetailsMissing?.length || 0,
        documentComponentIssues: results.documentComponentIssues?.length || 0
      },
      lastChecked: new Date().toISOString()
    };

    console.log('\n📊 CONSISTENCY STATUS REPORT');
    console.log('=' .repeat(40));
    console.log(`Overall Status: ${status.overallStatus}`);
    console.log(`Required Fields: ${status.fieldCount}`);
    console.log(`Document Components: ${status.documentComponentCount}`);
    console.log(`Issues Found: ${Object.values(status.issues).reduce((a, b) => a + b, 0)}`);
    console.log(`Last Checked: ${status.lastChecked}`);

    return status;
  }
}

// CLI interface
const command = process.argv[2];
const monitor = new AutomatedConsistencyMonitor();

switch (command) {
  case 'check':
    monitor.runSingleCheck();
    break;
  case 'watch':
    monitor.startWatching();
    break;
  case 'status':
    monitor.generateStatus();
    break;
  default:
    console.log(`
📋 Automated Proposal Consistency Monitor

Usage:
  node automated-consistency-monitor.js check   - Run single consistency check
  node automated-consistency-monitor.js watch   - Start continuous monitoring
  node automated-consistency-monitor.js status  - Show current status report

Examples:
  node automated-consistency-monitor.js check   # Quick check
  node automated-consistency-monitor.js watch   # Monitor file changes
  node automated-consistency-monitor.js status  # Status report
`);
}

export default AutomatedConsistencyMonitor;