/**
Save and restore a JSON object to and from local storage.
*/

interface Storage {
	store(key: string, obj: any): boolean;
	restore<T extends object>(key: string, target?: T): T;
	clear(key: string): void;
}

export default {
	store: function(key: string, obj: any): boolean {
		try {
			localStorage.setItem(key, JSON.stringify(obj));
			return true;
		} catch (e) {
			return false;
		}
	},
	
	restore: function<T extends object>(key: string, target: T = {} as T): T {
		try {
			const item = localStorage.getItem(key);
			if (item) {
				const obj = JSON.parse(item);
				Object.assign(target, obj);
			}
			return target;
		} catch (e) {
			return target;
		}
	},
	
	clear: function(key: string): void {
		localStorage.removeItem(key);
	}
} as Storage;