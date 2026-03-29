import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import { getAppId, getSocketURL } from '@/src/components/shared';
import { website_name } from '@/src/utils/site-config';
import APIMiddleware from './api-middleware';

export const getInitialLanguage = () => 'EN';

export const generateDerivApiInstance = () => {
    const cleanedServer = getSocketURL().replace(/[^a-zA-Z0-9.]/g, '');
    const cleanedAppId = getAppId()?.replace?.(/[^a-zA-Z0-9]/g, '') ?? getAppId();
    const socket_url = `wss://${cleanedServer}/websockets/v3?app_id=${cleanedAppId}&l=${getInitialLanguage()}&brand=${website_name.toLowerCase()}`;
    const deriv_socket = new WebSocket(socket_url);
    const deriv_api = new DerivAPIBasic({
        connection: deriv_socket,
        middleware: new APIMiddleware({}),
    });
    return deriv_api;
};

export const getLoginId = () => {
    const login_id = localStorage.getItem('active_loginid');
    if (login_id && login_id !== 'null') return login_id;
    return null;
};

export const V2GetActiveToken = () => {
    const token = localStorage.getItem('authToken');
    if (token && token !== 'null') return token;
    return null;
};

export const V2GetActiveClientId = () => {
    const token = V2GetActiveToken();

    if (!token) return null;
    const account_list_str = localStorage.getItem('accountsList');
    if (account_list_str && account_list_str !== 'null') {
        const account_list = JSON.parse(account_list_str);
        const active_clientId = Object.keys(account_list).find(key => account_list[key] === token);
        return active_clientId;
    }
    return null;
};

export const getToken = () => {
    const active_loginid = getLoginId();
    const client_accounts_str = localStorage.getItem('accountsList');
    const client_accounts = client_accounts_str ? JSON.parse(client_accounts_str) : undefined;
    const active_account = (client_accounts && active_loginid && client_accounts[active_loginid]) || localStorage.getItem('deriv_api_token');
    return {
        token: active_account ?? undefined,
        account_id: active_loginid ?? undefined,
    };
};
