/**
 * App params — ReadyNorm / Supabase only.
 * All Base44 references removed.
 */
const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

// Clean up any legacy Base44 keys left in localStorage
if (!isNode) {
	['base44_access_token', 'base44_app_id', 'base44_app_base_url', 'base44_functions_version', 'token'].forEach(k => {
		try { storage.removeItem(k); } catch {}
	});
}

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `readynorm_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	return {
		fromUrl: getAppParamValue("from_url", { defaultValue: isNode ? '/' : window.location.href }),
	}
}

export const appParams = {
	...getAppParams()
}
