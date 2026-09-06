/**
 * Adobe CSInterface - v9.0.0
 * Standard Adobe CEP JavaScript communication bridge
 */

function CSInterface() {}

CSInterface.prototype.evalScript = function(script, callback) {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.evalScript(script, callback);
    } else {
        console.warn("CSInterface not running in Adobe CEP host. Script simulated:", script);
        if (callback) {
            callback(JSON.stringify({ simulated: true, script: script }));
        }
    }
};

CSInterface.prototype.getHostEnvironment = function() {
    if (typeof window.__adobe_cep__ !== "undefined") {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    }
    return {
        appName: "PPRO",
        appVersion: "25.0.0",
        appLocale: "en_US",
        appUILocale: "en_US",
        appId: "PPRO"
    };
};

CSInterface.prototype.closeExtension = function() {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.closeExtension();
    } else {
        window.close();
    }
};

CSInterface.prototype.openURLInDefaultBrowser = function(url) {
    if (typeof cep !== "undefined" && cep.util) {
        cep.util.openURLInDefaultBrowser(url);
    } else {
        window.open(url, "_blank");
    }
};

CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.addEventListener(type, listener, obj);
    }
};

CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.removeEventListener(type, listener, obj);
    }
};

CSInterface.prototype.dispatchEvent = function(event) {
    if (typeof window.__adobe_cep__ !== "undefined") {
        window.__adobe_cep__.dispatchEvent(event);
    }
};

CSInterface.prototype.getSystemPath = function(pathType) {
    if (typeof window.__adobe_cep__ !== "undefined") {
        return window.__adobe_cep__.getSystemPath(pathType);
    }
    return "";
};
