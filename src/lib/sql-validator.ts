const ALLOWED_STARTS = ['SELECT', 'UPDATE', 'INSERT']
const BLOCKED_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE PROCEDURE'
]

// Only allow queries against these tables
const ALLOWED_TABLES = [
  'funded_deals',
  'reps',
  'lenders',
  'commission_payout_reps',
  'commission_payout_iso',
  'business_main'
]

export interface ValidationResult {
  valid: boolean
  error?: string
  operation?: 'SELECT' | 'UPDATE' | 'INSERT'
}

/**
 * Strips SQL comments to prevent bypass attacks
 * Removes -- line comments and /* block comments
 */
function stripComments(sql: string): string {
  // Remove block comments /* ... */
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, ' ')
  // Remove line comments -- ...
  result = result.replace(/--[^\n]*/g, ' ')
  return result
}

/**
 * Validates SQL queries for safety before execution
 * Only allows SELECT, UPDATE, INSERT against specific tables
 * Blocks DDL operations and multiple statements
 */
export function validateSQL(sql: string): ValidationResult {
  // Strip comments first to prevent bypass attacks
  const cleanedSql = stripComments(sql)
  const normalized = cleanedSql.trim().toUpperCase()

  // Check if empty after cleaning
  if (!normalized) {
    return {
      valid: false,
      error: 'Empty query after removing comments'
    }
  }

  // Check starts with allowed operation
  const matchedOp = ALLOWED_STARTS.find(op => normalized.startsWith(op))
  if (!matchedOp) {
    return {
      valid: false,
      error: 'Only SELECT, UPDATE, and INSERT operations are allowed'
    }
  }

  // Check for blocked keywords in cleaned SQL
  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(cleanedSql)) {
      return {
        valid: false,
        error: `Blocked keyword detected: ${keyword}`
      }
    }
  }

  // Check that query references only allowed tables
  const tablePattern = /\b(?:FROM|JOIN|INTO|UPDATE)\s+(?:public\.)?(\w+)/gi
  let match
  while ((match = tablePattern.exec(cleanedSql)) !== null) {
    const tableName = match[1].toLowerCase()
    if (!ALLOWED_TABLES.includes(tableName)) {
      return {
        valid: false,
        error: `Table not allowed: ${tableName}. Allowed tables: ${ALLOWED_TABLES.join(', ')}`
      }
    }
  }

  // Block multiple statements - check for semicolons not inside quotes
  // Simple approach: reject any semicolon that's followed by non-whitespace
  const semicolonCheck = cleanedSql.replace(/;[\s]*$/, '') // Allow trailing semicolon
  if (semicolonCheck.includes(';')) {
    return {
      valid: false,
      error: 'Multiple statements not allowed'
    }
  }

  return {
    valid: true,
    operation: matchedOp as 'SELECT' | 'UPDATE' | 'INSERT'
  }
}
