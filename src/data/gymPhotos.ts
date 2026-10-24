// Your own photos of the equipment at the gym, shown on each machine's guide next to the demo animation and the
// how to steps. Keys are machine keys from machines.ts. The files in assets/gym were shrunk from the originals.
import { ImageSourcePropType } from 'react-native';

const P = {
  power_rack_1: require('../../assets/gym/power_rack_1.jpg'),
  power_rack_2: require('../../assets/gym/power_rack_2.jpg'),
  smith_1: require('../../assets/gym/smith_1.jpg'),
  bench_press_1: require('../../assets/gym/bench_press_1.jpg'),
  leg_press_1: require('../../assets/gym/leg_press_1.jpg'),
  leg_press_2: require('../../assets/gym/leg_press_2.jpg'),
  barbells_1: require('../../assets/gym/barbells_1.jpg'),
  dumbbells_1: require('../../assets/gym/dumbbells_1.jpg'),
  dumbbells_2: require('../../assets/gym/dumbbells_2.jpg'),
  tower_1: require('../../assets/gym/tower_1.jpg'),
  functional_1: require('../../assets/gym/functional_1.jpg'),
  functional_2: require('../../assets/gym/functional_2.jpg'),
  functional_3: require('../../assets/gym/functional_3.jpg'),
} as const;

export const GYM_PHOTOS: Record<string, ImageSourcePropType[]> = {
  power_rack: [P.power_rack_1, P.power_rack_2],
  barbell: [P.power_rack_1, P.bench_press_1],
  bench_press_station: [P.bench_press_1],
  smith_machine: [P.smith_1],
  leg_press: [P.leg_press_1, P.leg_press_2],
  fixed_barbells: [P.barbells_1],
  ez_bar: [P.barbells_1],
  dumbbells: [P.dumbbells_1, P.dumbbells_2],
  bench: [P.dumbbells_1, P.dumbbells_2],
  pullup_bar: [P.tower_1],
  kettlebells: [P.functional_1],
  weight_plates: [P.functional_1],
  medicine_ball: [P.functional_1],
  exercise_ball: [P.functional_1],
  bosu: [P.functional_2],
  foam_roll: [P.functional_2],
  bands: [P.functional_1, P.functional_2],
  plyo_boxes: [P.power_rack_2, P.functional_2],
  jump_rope: [P.functional_3],
  ab_wheel: [P.functional_3],
  suspension_trainer: [P.functional_3],
};
