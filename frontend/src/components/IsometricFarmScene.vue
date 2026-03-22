<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Texture
} from 'pixi.js'
import type { GrowthTheme } from '@/utils/growth'
import {
  FARM_SCENE_ASSETS,
  getCropAssetKey,
  getToneColors,
  type IsometricFarmPlot,
  type FarmSceneKind
} from '@/utils/isometricFarm'

const props = withDefaults(defineProps<{
  scene: FarmSceneKind
  theme: GrowthTheme
  plots: IsometricFarmPlot[]
  selectedPlotId?: number | string | null
  interactive?: boolean
}>(), {
  selectedPlotId: null,
  interactive: false
})

const emit = defineEmits<{
  (event: 'select-plot', plotId: number | string): void
}>()

const host = ref<HTMLDivElement | null>(null)
const sceneReady = ref(false)

let app: Application | null = null
let resizeObserver: ResizeObserver | null = null
let renderToken = 0

const TILE_WIDTH = 96
const TILE_HEIGHT = 48
const TILE_SCALE = 0.34
const PROP_SCALE = 0.34

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getCanvasHeight() {
  return props.scene === 'groups' ? 560 : 640
}

function getPlotMetrics(plot: IsometricFarmPlot) {
  const rowCount = Math.max(plot.rows.length, 1)
  const colCount = Math.max(...plot.rows.map(row => row.length), 1)
  const width = ((colCount + rowCount) * TILE_WIDTH) / 2
  const height = ((colCount + rowCount) * TILE_HEIGHT) / 2
  return { rowCount, colCount, width, height }
}

function getPlotOrigin(index: number, total: number) {
  if (props.scene === 'groups') {
    const plotsPerRow = total <= 2 ? total : 3
    const column = index % plotsPerRow
    const row = Math.floor(index / plotsPerRow)
    return {
      x: (column - row) * 208,
      y: (column + row) * 82 + row * 20
    }
  }

  const plotsPerRow = total <= 2 ? total : 2
  const column = index % plotsPerRow
  const row = Math.floor(index / plotsPerRow)
  return {
    x: (column - row) * 248,
    y: (column + row) * 96 + row * 24
  }
}

function getTilePosition(column: number, row: number) {
  return {
    x: (column - row) * (TILE_WIDTH / 2),
    y: (column + row) * (TILE_HEIGHT / 2)
  }
}

function getTexture(assetKey: keyof typeof FARM_SCENE_ASSETS) {
  return Texture.from(FARM_SCENE_ASSETS[assetKey])
}

async function ensureApplication() {
  if (!host.value || app) return

  app = new Application()
  await app.init({
    width: host.value.clientWidth || 1200,
    height: getCanvasHeight(),
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    backgroundAlpha: 0
  })

  host.value.appendChild(app.canvas)
  sceneReady.value = true

  resizeObserver = new ResizeObserver(() => {
    if (!app || !host.value) return
    app.renderer.resize(host.value.clientWidth || 1200, getCanvasHeight())
    void renderScene()
  })
  resizeObserver.observe(host.value)
}

async function preloadAssets() {
  await Assets.load(Object.values(FARM_SCENE_ASSETS))
}

function drawSceneBase(root: Container, width: number, height: number) {
  const fieldShadow = new Graphics()
  fieldShadow.ellipse(0, height * 0.63, width * 0.54, 58)
  fieldShadow.fill({ color: 0x4f3a22, alpha: 0.12 })
  root.addChild(fieldShadow)

  const fieldPad = new Graphics()
  fieldPad.roundRect(-width * 0.52, 56, width * 1.04, height - 124, 28)
  fieldPad.fill({ color: props.theme === 'tree' ? 0x9ab289 : 0xa4bc77, alpha: 0.26 })
  root.addChild(fieldPad)
}

function createPlotHighlight(width: number, height: number, selected: boolean, tone: ReturnType<typeof getToneColors>) {
  const graphic = new Graphics()
  graphic.moveTo(0, 0)
  graphic.lineTo(width / 2, height / 2)
  graphic.lineTo(0, height)
  graphic.lineTo(-width / 2, height / 2)
  graphic.closePath()
  graphic.fill({ color: selected ? 0xf7d562 : tone.outline, alpha: selected ? 0.12 : 0.02 })
  graphic.stroke({
    color: selected ? 0xffef9b : tone.outline,
    alpha: selected ? 0.82 : 0.12,
    width: selected ? 3 : 1
  })
  return graphic
}

function drawPlot(root: Container, plot: IsometricFarmPlot, index: number, total: number) {
  const plotMetrics = getPlotMetrics(plot)
  const tone = getToneColors(plot.tone)
  const origin = getPlotOrigin(index, total)
  const plotContainer = new Container()
  plotContainer.sortableChildren = true
  plotContainer.position.set(origin.x, origin.y)

  const plotWidth = plotMetrics.width
  const plotHeight = plotMetrics.height
  const selected = props.selectedPlotId === plot.id

  const highlight = createPlotHighlight(plotWidth, plotHeight, selected, tone)
  highlight.position.set(0, plotHeight / 2)
  plotContainer.addChild(highlight)

  const area = new Graphics()
  area.moveTo(0, 0)
  area.lineTo(plotWidth / 2, plotHeight / 2)
  area.lineTo(0, plotHeight)
  area.lineTo(-plotWidth / 2, plotHeight / 2)
  area.closePath()
  area.fill({ color: 0xffffff, alpha: 0.001 })
  area.position.set(0, plotHeight / 2)
  if (props.interactive) {
    area.eventMode = 'static'
    area.cursor = 'pointer'
    area.on('pointertap', () => emit('select-plot', plot.id))
  }
  plotContainer.addChild(area)

  for (let row = 0; row < plot.rows.length; row += 1) {
    const currentRow = plot.rows[row]
    for (let column = 0; column < currentRow.length; column += 1) {
      const plant = currentRow[column]
      const tilePosition = getTilePosition(column, row)
      const tileTexture = getTexture(plant.placeholder ? 'dirt' : 'dirtFarmland')
      const tile = new Sprite(tileTexture)
      tile.anchor.set(0.5, 1)
      tile.position.set(tilePosition.x, tilePosition.y)
      tile.scale.set(TILE_SCALE)
      tile.zIndex = tilePosition.y
      plotContainer.addChild(tile)

      if (!plant.placeholder) {
        const crop = new Sprite(getTexture(getCropAssetKey({
          theme: props.theme,
          stage: plant.stage,
          featured: !!plant.featured,
          placeholder: !!plant.placeholder
        })))
        crop.anchor.set(0.5, 1)
        crop.position.set(tilePosition.x, tilePosition.y - 6)
        crop.scale.set(plant.featured ? PROP_SCALE + 0.02 : PROP_SCALE)
        crop.zIndex = tilePosition.y + 6
        plotContainer.addChild(crop)
      }
    }
  }

  root.addChild(plotContainer)
}

async function renderScene() {
  renderToken += 1
  const token = renderToken

  await ensureApplication()
  await preloadAssets()
  if (!app || !host.value || token !== renderToken) return

  app.stage.removeChildren()

  const width = app.renderer.width
  const height = app.renderer.height
  const world = new Container()
  world.sortableChildren = true
  world.position.set(width / 2, props.scene === 'groups' ? 88 : 102)

  const worldScale = clamp(width / (props.scene === 'groups' ? 980 : 1080), 0.66, 1.08)
  world.scale.set(worldScale)

  drawSceneBase(world, width, height)

  props.plots.forEach((plot, index) => {
    drawPlot(world, plot, index, props.plots.length)
  })

  app.stage.addChild(world)
}

onMounted(async () => {
  await renderScene()
})

watch(
  () => [props.scene, props.theme, props.selectedPlotId, props.plots],
  () => {
    void renderScene()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (app) {
    app.destroy(true, { children: true })
    app = null
  }
})
</script>

<template>
  <div
    ref="host"
    :class="[
      'pixi-farm-scene',
      `scene-${scene}`,
      `theme-${theme}`,
      scene === 'groups' ? 'group-pixi-scene' : 'class-pixi-scene',
      { interactive }
    ]"
    :data-testid="scene === 'groups' ? 'group-pixi-scene' : 'class-pixi-scene'"
    :data-scene="scene"
    :data-ready="sceneReady ? 'true' : 'false'"
  />
</template>

<style scoped>
.pixi-farm-scene {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 560px;
  border-radius: 34px;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.34), transparent 24%),
    linear-gradient(180deg, rgba(242, 236, 220, 0.96) 0%, rgba(220, 221, 176, 0.92) 18%, rgba(173, 186, 115, 0.94) 100%);
}

.pixi-farm-scene.scene-class {
  min-height: 640px;
}

.pixi-farm-scene.theme-tree {
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.3), transparent 24%),
    linear-gradient(180deg, rgba(237, 235, 224, 0.96) 0%, rgba(202, 211, 176, 0.92) 18%, rgba(153, 169, 128, 0.94) 100%);
}

.pixi-farm-scene canvas {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 780px) {
  .pixi-farm-scene {
    min-height: 460px;
  }

  .pixi-farm-scene.scene-class {
    min-height: 520px;
  }
}
</style>
