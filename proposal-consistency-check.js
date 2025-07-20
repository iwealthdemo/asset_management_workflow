#!/usr/bin/env node

/**
 * Manual Proposal Consistency Check
 * 
 * This script analyzes the source code of both proposal rendering components
 * to identify structural and content differences without requiring a running server.
 */

import fs from 'fs';
import path from 'path';

class ProposalConsistencyChecker {
  constructor() {
    this.myTasksPath = path.join(process.cwd(), 'client/src/pages/MyTasks.tsx');
    this.investmentDetailsPath = path.join(process.cwd(), 'client/src/components/details/InvestmentDetailsInline.tsx');
  }

  readSourceFiles() {
    if (!fs.existsSync(this.myTasksPath)) {
      throw new Error(`MyTasks.tsx not found at: ${this.myTasksPath}`);
    }
    if (!fs.existsSync(this.investmentDetailsPath)) {
      throw new Error(`InvestmentDetailsInline.tsx not found at: ${this.investmentDetailsPath}`);
    }

    return {
      myTasks: fs.readFileSync(this.myTasksPath, 'utf8'),
      investmentDetails: fs.readFileSync(this.investmentDetailsPath, 'utf8')
    };
  }

  extractProposalFields(sourceCode, componentName) {
    console.log(`\n🔍 Analyzing proposal fields in ${componentName}:`);
    
    const fields = [];
    const fieldPatterns = [
      /text-sm font-medium text-gray-600">([^<]+)<\/p>/g,
      /FormLabel>([^<]+)<\/FormLabel>/g,
      /text-lg font-semibold">[^}]*{[^}]*\.([^}]+)}/g,
      /text-lg font-semibold">([^<]+)<\/p>/g
    ];

    fieldPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(sourceCode)) !== null) {
        if (match[1] && !fields.includes(match[1])) {
          fields.push(match[1].trim());
        }
      }
    });

    // Manual field extraction for specific patterns
    if (sourceCode.includes('Request ID')) fields.push('Request ID');
    if (sourceCode.includes('Target Company')) fields.push('Target Company');
    if (sourceCode.includes('Risk Level')) fields.push('Risk Level');
    if (sourceCode.includes('Amount')) fields.push('Amount');
    if (sourceCode.includes('Expected Return')) fields.push('Expected Return');
    if (sourceCode.includes('Investment Type')) fields.push('Investment Type');
    if (sourceCode.includes('Status')) fields.push('Status');
    if (sourceCode.includes('Created Date')) fields.push('Created Date');
    if (sourceCode.includes('Investment Rationale')) fields.push('Investment Rationale / Description');

    // Remove duplicates and filter relevant fields
    const uniqueFields = [...new Set(fields)].filter(field => 
      field.length > 2 && 
      !field.includes('className') && 
      !field.includes('font-') &&
      !field.includes('text-')
    );

    console.log(`  Fields found: ${uniqueFields.join(', ')}`);
    return uniqueFields;
  }

  checkGridLayout(sourceCode, componentName) {
    console.log(`\n📐 Checking grid layout in ${componentName}:`);
    
    const gridMatches = sourceCode.match(/grid-cols-(\d+)/g);
    if (gridMatches) {
      console.log(`  Grid layout: ${gridMatches.join(', ')}`);
      return gridMatches;
    } else {
      console.log(`  No grid layout found`);
      return [];
    }
  }

  checkDocumentComponents(sourceCode, componentName) {
    console.log(`\n📄 Checking document components in ${componentName}:`);
    
    const components = {
      CrossDocumentQuery: sourceCode.includes('CrossDocumentQuery'),
      WebSearchQuery: sourceCode.includes('WebSearchQuery'),
      DocumentAnalysisCard: sourceCode.includes('DocumentAnalysisCard'),
      'Documents & AI Analysis': sourceCode.includes('Documents & AI Analysis')
    };

    Object.entries(components).forEach(([comp, found]) => {
      console.log(`  ${comp}: ${found ? '✅ Present' : '❌ Missing'}`);
    });

    return components;
  }

  checkStylingConsistency(sourceCode, componentName) {
    console.log(`\n🎨 Checking styling consistency in ${componentName}:`);
    
    const stylingElements = {
      'Risk Level Badge': sourceCode.includes('bg-red-100 text-red-800') && sourceCode.includes('bg-yellow-100 text-yellow-800'),
      'Gray Background': sourceCode.includes('bg-gray-50'),
      'Border Radius': sourceCode.includes('rounded'),
      'Padding': sourceCode.includes('p-3') || sourceCode.includes('p-4'),
      'Grid Gap': sourceCode.includes('gap-4')
    };

    Object.entries(stylingElements).forEach(([style, found]) => {
      console.log(`  ${style}: ${found ? '✅ Consistent' : '❌ Inconsistent'}`);
    });

    return stylingElements;
  }

  generateConsistencyReport() {
    console.log('🚀 Starting Proposal Rendering Consistency Analysis\n');
    console.log('=' .repeat(60));

    try {
      const sourceCode = this.readSourceFiles();

      // Extract fields from both components
      const myTasksFields = this.extractProposalFields(sourceCode.myTasks, 'MyTasks.tsx');
      const investmentDetailsFields = this.extractProposalFields(sourceCode.investmentDetails, 'InvestmentDetailsInline.tsx');

      // Check grid layouts
      const myTasksGrid = this.checkGridLayout(sourceCode.myTasks, 'MyTasks.tsx');
      const investmentDetailsGrid = this.checkGridLayout(sourceCode.investmentDetails, 'InvestmentDetailsInline.tsx');

      // Check document components
      const myTasksDocs = this.checkDocumentComponents(sourceCode.myTasks, 'MyTasks.tsx');
      const investmentDetailsDocs = this.checkDocumentComponents(sourceCode.investmentDetails, 'InvestmentDetailsInline.tsx');

      // Check styling
      const myTasksStyling = this.checkStylingConsistency(sourceCode.myTasks, 'MyTasks.tsx');
      const investmentDetailsStyling = this.checkStylingConsistency(sourceCode.investmentDetails, 'InvestmentDetailsInline.tsx');

      // Generate comparison report
      console.log('\n📊 CONSISTENCY ANALYSIS RESULTS');
      console.log('=' .repeat(60));

      // Field comparison
      console.log('\n🔍 FIELD COMPARISON:');
      const allFields = [...new Set([...myTasksFields, ...investmentDetailsFields])];
      
      allFields.forEach(field => {
        const inMyTasks = myTasksFields.includes(field);
        const inInvestmentDetails = investmentDetailsFields.includes(field);
        const status = (inMyTasks && inInvestmentDetails) ? '✅ Both' : 
                     (inMyTasks && !inInvestmentDetails) ? '⚠️  MyTasks only' :
                     (!inMyTasks && inInvestmentDetails) ? '⚠️  InvestmentDetails only' : '❌ Neither';
        
        console.log(`  ${field}: ${status}`);
      });

      // Grid layout comparison
      console.log('\n📐 GRID LAYOUT COMPARISON:');
      const gridConsistent = JSON.stringify(myTasksGrid) === JSON.stringify(investmentDetailsGrid);
      console.log(`  Layout consistency: ${gridConsistent ? '✅ Consistent' : '❌ Inconsistent'}`);
      console.log(`  MyTasks: ${myTasksGrid.join(', ') || 'No grid'}`);
      console.log(`  InvestmentDetails: ${investmentDetailsGrid.join(', ') || 'No grid'}`);

      // Document components comparison
      console.log('\n📄 DOCUMENT COMPONENTS COMPARISON:');
      Object.keys(myTasksDocs).forEach(comp => {
        const consistent = myTasksDocs[comp] === investmentDetailsDocs[comp];
        console.log(`  ${comp}: ${consistent ? '✅ Consistent' : '❌ Inconsistent'}`);
        if (!consistent) {
          console.log(`    MyTasks: ${myTasksDocs[comp] ? 'Present' : 'Missing'}`);
          console.log(`    InvestmentDetails: ${investmentDetailsDocs[comp] ? 'Present' : 'Missing'}`);
        }
      });

      // Generate recommendations
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('=' .repeat(60));

      const missingInMyTasks = investmentDetailsFields.filter(f => !myTasksFields.includes(f));
      const missingInInvestmentDetails = myTasksFields.filter(f => !investmentDetailsFields.includes(f));

      if (missingInMyTasks.length > 0) {
        console.log(`\n🔧 Add to MyTasks.tsx:`);
        missingInMyTasks.forEach(field => console.log(`  - ${field}`));
      }

      if (missingInInvestmentDetails.length > 0) {
        console.log(`\n🔧 Add to InvestmentDetailsInline.tsx:`);
        missingInInvestmentDetails.forEach(field => console.log(`  - ${field}`));
      }

      if (!gridConsistent) {
        console.log(`\n🔧 Fix grid layout inconsistency`);
      }

      const docInconsistencies = Object.entries(myTasksDocs).filter(([comp, present]) => present !== investmentDetailsDocs[comp]);
      if (docInconsistencies.length > 0) {
        console.log(`\n🔧 Fix document component inconsistencies:`);
        docInconsistencies.forEach(([comp]) => console.log(`  - ${comp}`));
      }

      const fieldDifferences = missingInMyTasks.length + missingInInvestmentDetails.length;
      const overallStatus = fieldDifferences === 0 && gridConsistent && docInconsistencies.length === 0 ? 'CONSISTENT' : 'INCONSISTENT';

      console.log(`\n🎯 OVERALL STATUS: ${overallStatus}`);
      console.log(`   Field differences: ${fieldDifferences}`);
      console.log(`   Grid layout: ${gridConsistent ? 'Consistent' : 'Inconsistent'}`);
      console.log(`   Document components: ${docInconsistencies.length === 0 ? 'Consistent' : 'Inconsistent'}`);

      return {
        status: overallStatus,
        fieldDifferences,
        gridConsistent,
        documentComponentsConsistent: docInconsistencies.length === 0,
        recommendations: {
          addToMyTasks: missingInMyTasks,
          addToInvestmentDetails: missingInInvestmentDetails,
          fixGrid: !gridConsistent,
          fixDocComponents: docInconsistencies.length > 0
        }
      };

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      return { status: 'ERROR', error: error.message };
    }
  }
}

// Run the analysis
const checker = new ProposalConsistencyChecker();
const results = checker.generateConsistencyReport();

// Save results
fs.writeFileSync('proposal-consistency-analysis.json', JSON.stringify(results, null, 2));
console.log('\n📄 Detailed analysis saved to: proposal-consistency-analysis.json');