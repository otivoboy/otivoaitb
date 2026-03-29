export default class APIMiddleware {
    constructor(config: any) {}
    send(request: any, next: any) {
        return next(request);
    }
}
