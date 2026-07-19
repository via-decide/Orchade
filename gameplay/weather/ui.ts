export type WeatherViewModel = {
  title: string;
  status: string;
};

export const createWeatherViewModel = (status: string): WeatherViewModel => ({
  title: 'Weather',
  status,
});
