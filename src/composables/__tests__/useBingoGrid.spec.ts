import { describe, it, expect, beforeEach } from 'vitest'
import { useBingoGrid } from '../useBingoGrid'

describe('useBingoGrid', () => {
  let grid: ReturnType<typeof useBingoGrid>

  beforeEach(() => {
    // Re-initialize for each test to ensure clean state
    grid = useBingoGrid()
  })

  it('initializes with default 5x5 grid', () => {
    expect(grid.config.value.gridSize).toBe(5)
    expect(grid.cells.value.length).toBe(25)
    
    // Check center cell is free space
    const centerIndex = Math.floor(25 / 2) // 12
    expect(grid.cells.value[centerIndex].isFreeSpace).toBe(true)
    expect(grid.cells.value[centerIndex].text).toBe('★')
  })

  it('can change grid size', () => {
    grid.setGridSize(3)
    expect(grid.config.value.gridSize).toBe(3)
    expect(grid.cells.value.length).toBe(9)
    
    // Check new center
    const centerIndex = Math.floor(9 / 2) // 4
    expect(grid.cells.value[centerIndex].isFreeSpace).toBe(true)
  })

  it('shuffles only unlocked cells and preserves their state', () => {
    // Populate some data so we can see it change
    grid.autoPopulate(Array.from({ length: 24 }, (_, i) => `Word ${i}`))
    
    // Lock cell 0
    grid.cells.value[0].isLocked = true
    const lockedId = grid.cells.value[0].id
    const originalTextZero = grid.cells.value[0].text

    // Remember free space ID and position
    const freeSpaceIndex = 12
    const freeSpaceId = grid.cells.value[freeSpaceIndex].id

    // Save the original unlocked IDs
    const originalOrder = grid.cells.value.map(c => c.id)

    // Shuffle
    grid.shuffleGrid()
    
    // 1. Locked cell should still be at index 0
    expect(grid.cells.value[0].id).toBe(lockedId)
    expect(grid.cells.value[0].text).toBe(originalTextZero)
    expect(grid.cells.value[0].isLocked).toBe(true)

    // 2. Free space should still be at index 12
    expect(grid.cells.value[freeSpaceIndex].id).toBe(freeSpaceId)
    expect(grid.cells.value[freeSpaceIndex].isFreeSpace).toBe(true)

    // 3. The overall order of unlocked cells should be different
    const newOrder = grid.cells.value.map(c => c.id)
    
    // With 23 shuffled items, the chances of it matching exactly are 1 in 2.5e22
    expect(newOrder).not.toEqual(originalOrder)
  })

  it('can toggle cell locks', () => {
    const firstCell = grid.cells.value[0]
    expect(firstCell.isLocked).toBe(false)
    
    grid.toggleLock(firstCell.id)
    expect(grid.cells.value[0].isLocked).toBe(true)
    
    grid.toggleLock(firstCell.id)
    expect(grid.cells.value[0].isLocked).toBe(false)
  })

  it('initializes with wordBreak true and supports toggling wordBreak per cell', () => {
    expect(grid.config.value.wordBreak).toBe(true)
    const firstCell = grid.cells.value[0]
    expect(firstCell.wordBreak).toBe(true)

    grid.updateCell(firstCell.id, { wordBreak: false })
    expect(grid.cells.value[0].wordBreak).toBe(false)
  })

  it('supports subtitle with custom font size and color', () => {
    expect(grid.config.value.subtitleFontSize).toBe(14)
    expect(grid.config.value.subtitleColor).toBe('#475569')

    grid.config.value.subtitle = 'First line\nSecond line'
    grid.config.value.subtitleFontSize = 18
    grid.config.value.subtitleColor = '#e11d48'

    expect(grid.config.value.subtitle).toContain('\n')
    expect(grid.config.value.subtitleFontSize).toBe(18)
    expect(grid.config.value.subtitleColor).toBe('#e11d48')
  })
})
