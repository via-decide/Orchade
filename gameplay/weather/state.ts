export type WeatherStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export type WeatherState = {
  module: 'weather';
  status: WeatherStatus;
  updatedAt: string | null;
};

export const initialWeatherState: WeatherState = {
  module: 'weather',
  status: 'in-progress',
  updatedAt: null,
};
