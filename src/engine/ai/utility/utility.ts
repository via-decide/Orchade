export type UtilityOption = { name: string; score(): number };
export function chooseUtility(options: UtilityOption[]): UtilityOption | undefined { return [...options].sort((a,b)=>b.score()-a.score())[0]; }
