import {AppMiddleware, Request, Response} from '@gravity-ui/expresskit';
import {AppConfig, AppContext} from '@gravity-ui/nodekit';

import CacheClient from '../../components/cache-client';
import {ChartsEngine} from '../../components/charts-engine';
import type {Plugin, TelemetryCallbacks} from '../../components/charts-engine/types';
import {startMonitoring} from '../../components/monitoring';
import {checkValidation} from '../../lib/validation';
import {ExtendedAppRouteDescription} from '../../types/controllers';

export function initChartsEngine({
    plugins,
    ctx,
    config,
    beforeAuth,
    afterAuth,
}: {
    plugins: Plugin[];
    ctx: AppContext;
    config: AppConfig;
    beforeAuth: AppMiddleware[];
    afterAuth: AppMiddleware[];
}) {
    const getTime = () => new Date().toISOString().replace('T', ' ').split('.')[0];

    if (config.chartsMonitoringEnabled) {
        startMonitoring(1000, ctx);
    }

    const telemetryCallbacks: TelemetryCallbacks = {
        onConfigFetched: ({id, statusCode, requestId, latency = 0}) => {
            ctx.stats('apiRequests', {
                requestId: requestId!,
                service: 'us',
                action: 'fetchConfig',
                responseStatus: statusCode || 200,
                requestTime: latency,
                requestMethod: 'POST',
                requestUrl: id || '',
            });
        },
        onConfigFetchingFailed: (_error, {id, statusCode, requestId, latency = 0}) => {
            ctx.stats('apiRequests', {
                requestId: requestId!,
                service: 'us',
                action: 'fetchConfig',
                responseStatus: statusCode || 500,
                requestTime: latency,
                requestMethod: 'POST',
                requestUrl: id || '',
            });
        },

        onDataFetched: ({sourceName, url, requestId, statusCode, latency}) => {
            ctx.stats('apiRequests', {
                requestId,
                service: sourceName || 'unknown-charts-source',
                action: 'fetchData',
                responseStatus: statusCode || 200,
                requestTime: latency,
                requestMethod: 'POST',
                requestUrl: url || '',
            });
        },
        onDataFetchingFailed: (_error, {sourceName, url, requestId, statusCode, latency}) => {
            ctx.stats('apiRequests', {
                requestId,
                service: sourceName || 'unknown-charts-source',
                action: 'fetchData',
                responseStatus: statusCode || 500,
                requestTime: latency,
                requestMethod: 'POST',
                requestUrl: url || '',
            });
        },

        onCodeExecuted: ({id, requestId, latency}) => {
            ctx.stats('executions', {
                datetime: getTime(),
                requestId,
                entryId: id,
                jsTabExecDuration: Math.ceil(latency),
            });
        },
    };

    const {appEnv, endpoints, chartsEngineConfig} = config;
    config.sources = config.getSourcesByEnv(appEnv as string);
    config.usEndpoint = endpoints.api.us + chartsEngineConfig.usEndpointPostfix;

    const cacheClient = new CacheClient({config});

    return new ChartsEngine({
        config,
        secrets: chartsEngineConfig.secrets,
        flags: chartsEngineConfig.flags,
        plugins,
        telemetryCallbacks: chartsEngineConfig.enableTelemetry ? telemetryCallbacks : undefined,
        cacheClient,
        nativeModules: chartsEngineConfig.nativeModules,
        beforeAuth,
        afterAuth,
    });
}

export function applyPluginRoutes({
    chartsEngine,
    routes,
    beforeAuth,
    afterAuth,
}: {
    chartsEngine: ChartsEngine;
    routes: Record<string, ExtendedAppRouteDescription>;
    beforeAuth: AppMiddleware[];
    afterAuth: AppMiddleware[];
}) {
    chartsEngine.plugins.forEach((plugin) => {
        const pluginRoutes = plugin.routes || [];

        pluginRoutes.forEach((pluginRoute) => {
            const routeValidationConfig = pluginRoute.validationConfig;
            let handler = pluginRoute.handler;
            if (routeValidationConfig) {
                handler = (req: Request, res: Response) => {
                    const validationResult = checkValidation(req, routeValidationConfig);
                    if (!validationResult.success) {
                        res.status(400).send({
                            message: validationResult.message,
                            details: validationResult.details,
                        });
                        return;
                    }
                    return pluginRoute.handler(req, res);
                };
            }

            const appRoute: Omit<ExtendedAppRouteDescription, 'route'> = {
                handler,
                beforeAuth,
                afterAuth,
            };

            if (pluginRoute.authPolicy) {
                appRoute.authPolicy = pluginRoute.authPolicy;
            }

            routes[`${pluginRoute.method} ${pluginRoute.path}`] = {
                ...appRoute,
                route: `${pluginRoute.method} ${pluginRoute.path}`,
            };
        });
    });
}
