"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPSTREAM_OUTPUT_ALIASES = void 0;
exports.setOutput = setOutput;
const core = __importStar(require("@actions/core"));
/**
 * Output names that mikepenz/release-changelog-builder-action publishes under
 * a different spelling. Anything not listed here already shares its name with
 * upstream (`changelog`, `owner`, `repo`, `contributors`, `failed`).
 *
 * Outputs matter more than inputs for compatibility, and fail more quietly: a
 * consumer reading `steps.x.outputs.pull_requests` from an action that does
 * not publish it receives an empty string, not an error, so the workflow
 * carries on with nothing and nobody is told.
 */
exports.UPSTREAM_OUTPUT_ALIASES = Object.freeze({
    'from-tag': 'fromTag',
    'to-tag': 'toTag',
    'pull-requests': 'pull_requests'
});
/**
 * Publish an output under this action's canonical name and, where upstream
 * spells it differently, under that name too.
 */
function setOutput(name, value) {
    core.setOutput(name, value);
    const alias = exports.UPSTREAM_OUTPUT_ALIASES[name];
    if (alias) {
        core.setOutput(alias, value);
    }
}
//# sourceMappingURL=outputs.js.map