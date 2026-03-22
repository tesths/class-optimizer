export interface Student {
  name: string
  studentNo: string
  gender: '男' | '女'
}

export interface Group {
  name: string
}

export interface ScoreItem {
  name: string
  type: 'plus' | 'minus'
  value: number
  subject: string
}

export interface TestData {
  teacher: { username: string; password: string; realName: string; subject: string }
  term: { name: string; startDate: string; endDate: string }
  class: { name: string; grade: string; schoolYear: string; theme: 'farm' | 'tree' }
  students: Student[]
  groups: Group[]
  scoreItems: ScoreItem[]
}

// Helper to generate unique test data using timestamp
export function generateTestData(): TestData {
  const timestamp = Date.now()
  return {
    teacher: {
      username: `teacher_${timestamp}`,
      password: 'password123',
      realName: '测试教师',
      subject: '语文'
    },
    term: {
      name: `2025-2026学年第一学期`,
      startDate: '2025-09-01',
      endDate: '2026-01-15'
    },
    class: {
      name: `测试班级${timestamp}`,
      grade: '三年级',
      schoolYear: '2025',
      theme: 'farm'
    },
    students: [
      { name: `学生A_${timestamp}`, studentNo: String(timestamp).slice(-6), gender: '男' },
      { name: `学生B_${timestamp}`, studentNo: String(timestamp + 1).slice(-6), gender: '女' }
    ],
    groups: [
      { name: `小组A_${timestamp}` },
      { name: `小组B_${timestamp}` }
    ],
    scoreItems: [
      { name: '上课发言', type: 'plus', value: 2, subject: '语文' },
      { name: '作业优秀', type: 'plus', value: 5, subject: '语文' },
      { name: '迟到', type: 'minus', value: 1, subject: '纪律' }
    ]
  }
}
