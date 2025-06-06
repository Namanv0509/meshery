import { PureAbility } from '@casl/ability';
import { createCanShow } from '@sistent/sistent';
import _ from 'lodash';
import { CapabilitiesRegistry } from './disabledComponents';
import { store } from '../store';
import { mesheryEventBus } from './eventBus';

export const ability = new PureAbility([]);

export default function CAN(action, subject) {
  return ability.can(action, _.lowerCase(subject));
}

const getCapabilitiesRegistry = () =>
  new CapabilitiesRegistry(store.getState().capabilitiesRegistry);

export const CanShow = createCanShow(getCapabilitiesRegistry, CAN, () => mesheryEventBus);
