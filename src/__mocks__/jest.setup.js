import nock from "nock";
nock.disableNetConnect();
export function allowNetConnect(host) {
    if (host) {
        nock.enableNetConnect(host);
    }
    else {
        nock.enableNetConnect();
    }
}
// Mock the logger globally for all tests
jest.mock("../utils/logging", () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        fatal: jest.fn(),
        child: jest.fn().mockReturnValue({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            fatal: jest.fn(),
        }),
    },
}));
// Implementation that matches src/utils/path.ts
function toPosixPath(p) {
    // Extended-Length Paths in Windows start with "\\?\" to allow longer paths
    // and bypass usual parsing. If detected, we return the path unmodified.
    const isExtendedLengthPath = p.startsWith("\\\\?\\");
    if (isExtendedLengthPath) {
        return p;
    }
    return p.replace(/\\/g, "/");
}
if (!String.prototype.toPosix) {
    String.prototype.toPosix = function () {
        return toPosixPath(this);
    };
}
//# sourceMappingURL=jest.setup.js.map