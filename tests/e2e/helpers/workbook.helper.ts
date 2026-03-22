import { execFileSync } from 'child_process'
import path from 'path'

export function readWorkbookRows(filePath: string, maxRows = 3, maxCols = 6): string[][] {
  const pythonBin = path.resolve(process.cwd(), 'backend/venv/bin/python')
  const helperScript = path.resolve(process.cwd(), 'tests/e2e/helpers/read_workbook.py')

  const raw = execFileSync(pythonBin, [helperScript, filePath, String(maxRows), String(maxCols)], {
    cwd: process.cwd(),
    encoding: 'utf-8'
  })

  return JSON.parse(raw) as string[][]
}
