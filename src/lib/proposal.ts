import { CONTRACT_TYPES } from '../components/shared';

export const DEFAULT_OPTIONS_PROPOSAL_REQUEST = {
    amount: undefined,
    basis: 'stake',
    contract_type: undefined,
    currency: undefined,
    symbol: undefined,
    duration: undefined,
    duration_unit: undefined,
    proposal: 1,
};

export const requestOptionsProposalForQS = (input_values: any, ws: any) => {
    const { amount, currency, symbol, contract_type, duration, duration_unit, basis } = input_values;

    const proposal_request: any = {
        ...DEFAULT_OPTIONS_PROPOSAL_REQUEST,
        amount,
        currency,
        symbol,
        contract_type,
        duration,
        duration_unit,
        basis,
    };

    // Add barrier value of 5 only for specific digit contract types
    const digit_contracts = [
        CONTRACT_TYPES.MATCH_DIFF.MATCH, // DIGITMATCH
        CONTRACT_TYPES.MATCH_DIFF.DIFF, // DIGITDIFF
        CONTRACT_TYPES.OVER_UNDER.OVER, // DIGITOVER
        CONTRACT_TYPES.OVER_UNDER.UNDER, // DIGITUNDER
    ];

    if (digit_contracts.includes(contract_type)) {
        proposal_request.barrier = '5';
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ proposal: 1, ...proposal_request }));
    }

    return proposal_request;
};
