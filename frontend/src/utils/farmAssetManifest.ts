export const FARM_ASSET_BASE = '/farm-assets' as const

export const FARM_TILE_ASSETS = {
  dirtBase: `${FARM_ASSET_BASE}/tiles/dirt_base.png`,
  farmlandPlot: `${FARM_ASSET_BASE}/tiles/farmland_plot.png`,
  pathPlanks: `${FARM_ASSET_BASE}/tiles/path_planks.png`,
  pathPlanksOld: `${FARM_ASSET_BASE}/tiles/path_planks_old.png`,
  pathCornerLeft: `${FARM_ASSET_BASE}/tiles/path_corner_left.png`,
  pathCornerRight: `${FARM_ASSET_BASE}/tiles/path_corner_right.png`
} as const

export const FARM_CROP_ASSETS = {
  cornYoungSingle: `${FARM_ASSET_BASE}/crops/corn_young_single.png`,
  cornMatureSingle: `${FARM_ASSET_BASE}/crops/corn_mature_single.png`,
  cornYoungCluster: `${FARM_ASSET_BASE}/crops/corn_young_cluster.png`,
  cornMatureCluster: `${FARM_ASSET_BASE}/crops/corn_mature_cluster.png`,
  haySmall: `${FARM_ASSET_BASE}/crops/hay_small.png`,
  hayBales: `${FARM_ASSET_BASE}/crops/hay_bales.png`,
  hayStack: `${FARM_ASSET_BASE}/crops/hay_stack.png`,
  ogaCropTileset: `${FARM_ASSET_BASE}/crops/oga_crops_tileset.png`
} as const

export const FARM_PROP_ASSETS = {
  shackWall: `${FARM_ASSET_BASE}/props/shack_wall.png`,
  shackRoof: `${FARM_ASSET_BASE}/props/shack_roof.png`,
  chimneyBase: `${FARM_ASSET_BASE}/props/chimney_base.png`,
  chimneyTop: `${FARM_ASSET_BASE}/props/chimney_top.png`,
  fenceLow: `${FARM_ASSET_BASE}/props/fence_low.png`,
  sack: `${FARM_ASSET_BASE}/props/sack.png`,
  sacksCrate: `${FARM_ASSET_BASE}/props/sacks_crate.png`,
  ladderStand: `${FARM_ASSET_BASE}/props/ladder_stand.png`
} as const

export const FARM_ASSET_LICENSE_DOCS = {
  sourceList: `${FARM_ASSET_BASE}/docs/ASSET-SOURCES.md`,
  kenneyLicense: `${FARM_ASSET_BASE}/docs/KENNEY-LICENSE.txt`
} as const

export type FarmTileAssetKey = keyof typeof FARM_TILE_ASSETS
export type FarmCropAssetKey = keyof typeof FARM_CROP_ASSETS
export type FarmPropAssetKey = keyof typeof FARM_PROP_ASSETS
