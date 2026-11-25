declare module 'virtual:knight-pixi' {
  export function createKnightPixi(image: HTMLImageElement, report: (mode: 'pixi' | 'canvas') => void):
    Promise<import('./game/render/knight-pixi-contract').KnightPixiRenderer | null>
}
