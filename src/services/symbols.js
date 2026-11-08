// Symbols a module can wear on the monitoring dashboard (drawn by <Icon>).
export const SYMBOLS = [
  ['power', 'Power'], ['lightbulb', 'Light'], ['plug', 'Plug'], ['sliders', 'Dimmer'], ['fan', 'Fan'],
  ['thermometer', 'Temperature'], ['droplet', 'Humidity'], ['waves', 'Water'], ['cloudrain', 'Rain'],
  ['flame', 'Heat'], ['snowflake', 'Cooling'], ['wind', 'Air'], ['sun', 'Sun'], ['moon', 'Night'],
  ['radar', 'Presence'], ['eye', 'Motion'], ['user', 'Person'], ['gauge', 'Gauge'], ['ruler', 'Distance'],
  ['clock', 'Clock'], ['bell', 'Bell'], ['speaker', 'Speaker'], ['music', 'Music'], ['alert', 'Alert'],
  ['door', 'Door'], ['window', 'Window'], ['garage', 'Garage'], ['home', 'Home'], ['car', 'Car'],
  ['bed', 'Bedroom'], ['sofa', 'Living room'], ['tv', 'TV'], ['camera', 'Camera'], ['wifi', 'Network'],
  ['battery', 'Battery'], ['shield', 'Security'], ['leaf', 'Garden'], ['star', 'Favourite'], ['heart', 'Care'],
  ['input', 'Input'], ['chip', 'Chip'], ['sparkle', 'Sparkle'], ['layers', 'Layers'],
].map(([key, label]) => ({ key, label }))
