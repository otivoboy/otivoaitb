export const CONTRACT_TYPES = {
    MATCH_DIFF: {
        MATCH: 'DIGITMATCH',
        DIFF: 'DIGITDIFF',
    },
    OVER_UNDER: {
        OVER: 'DIGITOVER',
        UNDER: 'DIGITUNDER',
    },
    EVEN_ODD: {
        EVEN: 'DIGITEVEN',
        ODD: 'DIGITODD',
    },
    RISE_FALL: {
        RISE: 'CALL',
        FALL: 'PUT',
    },
};

export const getAppId = () => {
    return '45065';
};

export const getSocketURL = () => {
    return 'ws.binaryws.com';
};
