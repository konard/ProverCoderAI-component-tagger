type Json =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<Json>
  | { readonly [key: string]: Json }

declare module "*.json" {
  const value: Json
  export default value
}
