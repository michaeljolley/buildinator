import { Events } from '../constants';

export class Listener<T> {
    constructor(
        public type: Events,
        public listener: (arg: T) => void
    ) { }
}