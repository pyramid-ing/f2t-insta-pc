import { ElementHandle, Page } from 'playwright'
import { sleep } from './sleep'

export async function humanClick(page: Page, selector: string | ElementHandle): Promise<void> {
  await sleep(Math.random() * 500 + 200) // 200-700ms 랜덤 딜레이

  if (typeof selector === 'string') {
    await page.click(selector)
  } else {
    await selector.click()
  }

  await sleep(Math.random() * 300 + 100) // 100-400ms 랜덤 딜레이
}

export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await sleep(Math.random() * 500 + 200) // 200-700ms 랜덤 딜레이

  // 필드 클리어
  await page.fill(selector, '')
  await sleep(100)

  // 텍스트 타이핑 (실제 타이핑처럼 시뮬레이션)
  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 50 + 50 }) // 50-100ms per character
  }

  await sleep(Math.random() * 300 + 100) // 100-400ms 랜덤 딜레이
}
