import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import escomplex from 'escomplex';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Parse JavaScript/TypeScript file and extract AST information
 * @param {string} filePath - Path to file
 * @returns {Object} AST analysis results
 */
export function analyzeAST(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy', 'classProperties']
    });

    const result = {
      file: filePath,
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      variables: []
    };

    traverse.default(ast, {
      FunctionDeclaration(path) {
        result.functions.push({
          name: path.node.id?.name || 'anonymous',
          params: path.node.params.length,
          async: path.node.async,
          generator: path.node.generator,
          loc: path.node.loc
        });
      },
      ArrowFunctionExpression(path) {
        const parent = path.parent;
        if (parent.type === 'VariableDeclarator') {
          result.functions.push({
            name: parent.id.name,
            params: path.node.params.length,
            async: path.node.async,
            arrow: true,
            loc: path.node.loc
          });
        }
      },
      ClassDeclaration(path) {
        const methods = [];
        path.node.body.body.forEach(member => {
          if (member.type === 'ClassMethod') {
            methods.push({
              name: member.key.name,
              kind: member.kind,
              static: member.static,
              async: member.async
            });
          }
        });
        result.classes.push({
          name: path.node.id.name,
          superClass: path.node.superClass?.name,
          methods,
          loc: path.node.loc
        });
      },
      ImportDeclaration(path) {
        result.imports.push({
          source: path.node.source.value,
          specifiers: path.node.specifiers.map(s => ({
            type: s.type,
            local: s.local.name,
            imported: s.imported?.name
          }))
        });
      },
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          const decl = path.node.declaration;
          if (decl.type === 'FunctionDeclaration') {
            result.exports.push({ type: 'function', name: decl.id.name });
          } else if (decl.type === 'ClassDeclaration') {
            result.exports.push({ type: 'class', name: decl.id.name });
          } else if (decl.type === 'VariableDeclaration') {
            decl.declarations.forEach(d => {
              result.exports.push({ type: 'variable', name: d.id.name });
            });
          }
        }
      },
      ExportDefaultDeclaration(path) {
        const decl = path.node.declaration;
        result.exports.push({
          type: 'default',
          name: decl.id?.name || decl.name || 'default'
        });
      },
      VariableDeclaration(path) {
        path.node.declarations.forEach(decl => {
          if (decl.id.type === 'Identifier') {
            result.variables.push({
              name: decl.id.name,
              kind: path.node.kind,
              loc: decl.loc
            });
          }
        });
      }
    });

    return result;
  } catch (err) {
    return { error: err.message, file: filePath };
  }
}

/**
 * Calculate cyclomatic complexity for a file
 * @param {string} filePath - Path to file
 * @returns {Object} Complexity analysis results
 */
export function analyzeComplexity(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf-8');
    const result = escomplex.analyse(code, {
      loc: true,
      newmi: true
    });

    return {
      file: filePath,
      aggregate: {
        cyclomatic: result.aggregate.cyclomatic || 0,
        cyclomaticDensity: result.aggregate.cyclomaticDensity || 0,
        halstead: result.aggregate.halstead || {},
        params: result.aggregate.params || 0,
        sloc: result.aggregate.sloc || { physical: 0, logical: 0 }
      },
      methods: (result.methods || []).map(m => ({
        name: m.name || 'anonymous',
        line: m.line || 0,
        cyclomatic: m.cyclomatic || 0,
        cyclomaticDensity: m.cyclomaticDensity || 0,
        halstead: m.halstead || {},
        params: m.params || 0,
        sloc: m.sloc || { physical: 0, logical: 0 }
      })),
      maintainability: result.maintainability || 0
    };
  } catch (err) {
    return {
      error: err.message,
      file: filePath,
      aggregate: { cyclomatic: 0, cyclomaticDensity: 0, halstead: {}, params: 0, sloc: { physical: 0, logical: 0 } },
      methods: [],
      maintainability: 0
    };
  }
}

/**
 * Analyze dependencies in a directory
 * @param {string} dirPath - Path to directory
 * @returns {Object} Dependency graph
 */
export function analyzeDependencies(dirPath) {
  try {
    const graph = {
      nodes: [],
      edges: []
    };

    const files = [];
    const walk = (dir) => {
      try {
        for (const entry of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, entry);
          try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
              walk(fullPath);
            } else if (stat.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry)) {
              files.push(fullPath);
            }
          } catch (err) { /* skip */ }
        }
      } catch (err) { /* skip */ }
    };

    walk(dirPath);

    // Build dependency graph
    const fileMap = new Map();
    files.forEach(file => {
      const relativePath = path.relative(dirPath, file);
      fileMap.set(file, relativePath);
      graph.nodes.push({
        id: relativePath,
        path: file
      });
    });

    files.forEach(file => {
      try {
        const code = fs.readFileSync(file, 'utf-8');
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'decorators-legacy']
        });

        const sourceId = path.relative(dirPath, file);

        traverse.default(ast, {
          ImportDeclaration(nodePath) {
            const importPath = nodePath.node.source.value;
            
            // Resolve relative imports
            if (importPath.startsWith('.')) {
              const resolvedPath = path.resolve(path.dirname(file), importPath);
              const targetFile = files.find(f => {
                const withoutExt = f.replace(/\.(js|jsx|ts|tsx)$/, '');
                const resolvedWithoutExt = resolvedPath.replace(/\.(js|jsx|ts|tsx)$/, '');
                return withoutExt === resolvedWithoutExt || f === resolvedPath;
              });

              if (targetFile) {
                const targetId = path.relative(dirPath, targetFile);
                graph.edges.push({
                  from: sourceId,
                  to: targetId,
                  type: 'import'
                });
              }
            }
          }
        });
      } catch (err) { /* skip unparseable files */ }
    });

    return {
      directory: dirPath,
      totalFiles: graph.nodes.length,
      totalDependencies: graph.edges.length,
      nodes: graph.nodes,
      edges: graph.edges
    };
  } catch (err) {
    return { error: err.message, directory: dirPath };
  }
}

/**
 * Get summary statistics for AST analysis
 * @param {Object} astResult - AST analysis result
 * @returns {string} Summary text
 */
export function getASTSummary(astResult) {
  if (astResult.error) return `Error: ${astResult.error}`;
  
  return `File: ${astResult.file}
Functions: ${astResult.functions.length}
Classes: ${astResult.classes.length}
Imports: ${astResult.imports.length}
Exports: ${astResult.exports.length}
Variables: ${astResult.variables.length}`;
}

/**
 * Get summary statistics for complexity analysis
 * @param {Object} complexityResult - Complexity analysis result
 * @returns {string} Summary text
 */
export function getComplexitySummary(complexityResult) {
  if (complexityResult.error) return `Error: ${complexityResult.error}`;
  
  const highComplexity = complexityResult.methods.filter(m => m.cyclomatic > 10);
  
  return `File: ${complexityResult.file}
Cyclomatic Complexity: ${complexityResult.aggregate.cyclomatic}
Maintainability Index: ${complexityResult.maintainability.toFixed(2)}
Methods: ${complexityResult.methods.length}
High Complexity Methods (>10): ${highComplexity.length}
SLOC: ${complexityResult.aggregate.sloc.physical}`;
}

/**
 * Get summary statistics for dependency analysis
 * @param {Object} depResult - Dependency analysis result
 * @returns {string} Summary text
 */
export function getDependencySummary(depResult) {
  if (depResult.error) return `Error: ${depResult.error}`;
  
  return `Directory: ${depResult.directory}
Total Files: ${depResult.totalFiles}
Total Dependencies: ${depResult.totalDependencies}
Average Dependencies per File: ${(depResult.totalDependencies / depResult.totalFiles).toFixed(2)}`;
}

