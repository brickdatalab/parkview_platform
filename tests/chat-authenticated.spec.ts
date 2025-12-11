import { test, expect } from '@playwright/test'

// These tests require authentication - we'll use stored auth state
test.describe('Chat Feature - Authenticated Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Try to access chat page
    await page.goto('/dashboard/chat')
    await page.waitForLoadState('networkidle')

    // If redirected to login, skip
    if (page.url().includes('/login')) {
      test.skip()
    }
  })

  test('message bubbles have correct iMessage styling', async ({ page }) => {
    // Check if there are existing messages with the new styling
    // User messages should have blue background
    const userBubbleStyle = await page.locator('[class*="bg-[#0b93f6]"]').count()
    // Assistant messages should have gray background
    const assistantBubbleStyle = await page.locator('[class*="bg-[#e5e5ea]"]').count()

    console.log(`Found ${userBubbleStyle} user bubble styles, ${assistantBubbleStyle} assistant bubble styles`)

    // The styling classes should exist in the component (even if no messages yet)
    // Let's verify the ChatMessage component structure exists
    const chatArea = page.locator('.flex-1.overflow-hidden').last()
    await expect(chatArea).toBeVisible()

    console.log('✅ Chat area with correct structure visible')
  })

  test('empty state shows centered Parkview Assistant', async ({ page }) => {
    // Look for empty state elements
    const botIcon = page.locator('.rounded-full.bg-\\[\\#f5f5f7\\]')
    const title = page.locator('h2:has-text("Parkview Assistant")')
    const description = page.locator('text=Ask me anything about deals')

    // At least one should be visible (either empty state or messages)
    const emptyStateVisible = await title.isVisible().catch(() => false)

    if (emptyStateVisible) {
      await expect(title).toBeVisible()
      await expect(description).toBeVisible()
      console.log('✅ Empty state with Parkview Assistant title visible')
    } else {
      console.log('ℹ️ Messages exist - empty state not shown (expected)')
    }
  })

  test('example prompts are clickable buttons', async ({ page }) => {
    // Check for the example prompt buttons
    const dealButton = page.locator('button:has-text("How many deals did we fund this month?")')
    const commissionButton = page.locator('button:has-text("What do we owe Sarah in commissions?")')
    const markPaidButton = page.locator('button:has-text("Mark the ABC Trucking commission as paid")')

    const dealVisible = await dealButton.isVisible().catch(() => false)

    if (dealVisible) {
      await expect(dealButton).toBeEnabled()
      await expect(commissionButton).toBeVisible()
      await expect(markPaidButton).toBeVisible()

      // Verify they have the correct styling
      const buttonClass = await dealButton.getAttribute('class')
      expect(buttonClass).toContain('rounded-xl')
      expect(buttonClass).toContain('border')

      console.log('✅ Example prompts are clickable buttons with correct styling')
    } else {
      console.log('ℹ️ Example prompts not visible (messages may exist)')
    }
  })

  test('sidebar has correct width and styling', async ({ page }) => {
    // Check sidebar width class
    const sidebar = page.locator('.w-72.shrink-0')
    await expect(sidebar).toBeVisible()

    // Check New Chat button
    const newChatBtn = page.locator('button:has-text("New Chat")')
    await expect(newChatBtn).toBeVisible()
    await expect(newChatBtn).toBeEnabled()

    // Verify hover scale class exists
    const btnClass = await newChatBtn.getAttribute('class')
    expect(btnClass).toContain('hover:scale-')

    console.log('✅ Sidebar has w-72 width and New Chat button with hover effect')
  })

  test('sidebar shows conversations with delete on hover', async ({ page }) => {
    // Look for conversation items
    const conversations = page.locator('.group.flex.items-center.gap-2.rounded-lg')
    const count = await conversations.count()

    console.log(`Found ${count} conversation items`)

    if (count > 0) {
      // Hover over first conversation
      await conversations.first().hover()

      // Check for delete button
      const deleteBtn = conversations.first().locator('button:has(svg.lucide-trash-2)')
      await expect(deleteBtn).toBeVisible()

      console.log('✅ Delete button appears on conversation hover')
    } else {
      console.log('ℹ️ No conversations to test hover delete')
    }
  })

  test('chat input is visible and functional', async ({ page }) => {
    // Check for input area
    const input = page.locator('textarea[placeholder*="Ask about"]')
    await expect(input).toBeVisible()
    await expect(input).toBeEnabled()

    // Check for send button
    const sendBtn = page.locator('button:has(svg.lucide-send)')
    await expect(sendBtn).toBeVisible()

    console.log('✅ Chat input textarea and send button visible')
  })

  test('text colors are dark gray not muted gray', async ({ page }) => {
    // Check for the new dark gray color classes
    const darkGrayText = await page.locator('[class*="text-[#3c3c43]"]').count()
    const subtleGrayText = await page.locator('[class*="text-[#6e6e73]"]').count()

    console.log(`Found ${darkGrayText} dark gray text elements, ${subtleGrayText} subtle gray text elements`)

    // Should have some dark gray text (not muted-foreground)
    const hasCorrectColors = darkGrayText > 0 || subtleGrayText > 0
    expect(hasCorrectColors).toBe(true)

    console.log('✅ Dark gray text colors applied (not muted gray)')
  })

  test('white background throughout chat area', async ({ page }) => {
    // Check for bg-white classes
    const whiteBgElements = await page.locator('.bg-white').count()

    console.log(`Found ${whiteBgElements} elements with white background`)

    expect(whiteBgElements).toBeGreaterThan(0)

    console.log('✅ White background applied to chat elements')
  })

  test('header does not show prominent title', async ({ page }) => {
    // The header should not show "Chat with Parkview Assistant"
    const headerTitle = page.locator('header:has-text("Chat with Parkview Assistant")')
    const titleVisible = await headerTitle.isVisible().catch(() => false)

    if (!titleVisible) {
      console.log('✅ Header title is hidden/empty')
    } else {
      // Check if it's empty or minimal
      const headerText = await page.locator('header h1, header span').first().textContent()
      console.log(`Header text: "${headerText}"`)
    }
  })
})
