import React from 'react';

import {AxiosResponse} from 'axios';
import debounce from 'lodash/debounce';
import {useSelector} from 'react-redux';
import {useHistory} from 'react-router-dom';
import {DashTabItemControlSourceType, Feature} from 'shared';
import {adjustWidgetLayout as dashkitAdjustWidgetLayout} from 'ui/components/DashKit/utils';

import {
    ChartKitWrapperLoadStatusUnknown,
    ChartKitWrapperOnLoadProps,
} from '../../../../libs/DatalensChartkit/components/ChartKitBase/types';
import {ResponseError} from '../../../../libs/DatalensChartkit/modules/data-provider/charts';
import {selectIsNewRelations} from '../../../../units/dash/store/selectors/dashTypedSelectors';
import Utils from '../../../../utils';
import {WidgetPluginProps} from '../../../DashKit/plugins/Widget/types';
import {
    getPreparedConstants,
    getWidgetSelectorMeta,
    getWidgetSelectorMetaOld,
    pushStats,
} from '../helpers/helpers';
import {
    ChartWidgetProps,
    ResolveMetaDataRef,
    ResolveWidgetControlDataRef,
    ResolveWidgetControlDataRefArgs,
} from '../types';

import {LoadingChartHookProps, useLoadingChart} from './useLoadingChart';

type LoadingChartSelectorHookProps = Pick<
    WidgetPluginProps,
    'adjustWidgetLayout' | 'gridLayout' | 'layout'
> &
    Pick<
        LoadingChartHookProps,
        | 'chartKitRef'
        | 'hasChangedOuterProps'
        | 'hasChangedOuterParams'
        | 'initialData'
        | 'requestId'
        | 'requestCancellationRef'
        | 'rootNodeRef'
        | 'usedParamsRef'
        | 'innerParamsRef'
        | 'widgetDataRef'
        | 'widgetType'
    > &
    ChartWidgetProps & {
        widgetId: WidgetPluginProps['id'];
        chartId: string;
    };

const WIDGET_DEBOUNCE_TIMEOUT = 300;
const WIDGET_RESIZE_DEBOUNCE_TIMEOUT = 600;
export const useLoadingChartSelector = (props: LoadingChartSelectorHookProps) => {
    const {
        dataProvider,
        initialData,
        requestId,
        requestCancellationRef,
        rootNodeRef,
        hasChangedOuterProps,
        hasChangedOuterParams,
        adjustWidgetLayout,
        widgetId,
        gridLayout,
        layout,
        noVeil,
        noLoader,
        compactLoader,
        loaderDelay,
        onStateAndParamsChange,
        chartKitRef,
        width,
        height,
        usedParamsRef,
        innerParamsRef,
        widgetDataRef,
        usageType,
        chartId,
        widgetType,
    } = props;

    const resolveMetaDataRef = React.useRef<ResolveMetaDataRef>();
    const resolveWidgetDataRef = React.useRef<ResolveWidgetControlDataRef>();

    const isNewRelations = useSelector(selectIsNewRelations);

    const history = useHistory();

    /**
     * debounced call of recalculate widget layout after rerender
     */
    const adjustLayout = React.useCallback(
        (needSetDefault) => {
            dashkitAdjustWidgetLayout({
                widgetId,
                needSetDefault,
                rootNode: rootNodeRef,
                gridLayout,
                layout,
                cb: adjustWidgetLayout,
            });
        },
        [widgetId, rootNodeRef, gridLayout, adjustWidgetLayout],
    );

    /**
     * triggers from chartkit after each it's render
     */
    const handleRenderChartWidget = React.useCallback(
        (renderedData: ChartKitWrapperOnLoadProps | ChartKitWrapperLoadStatusUnknown) => {
            if (renderedData?.status === 'success') {
                pushStats(renderedData, 'dash', dataProvider);
            }
        },
        [dataProvider],
    );

    /**
     * handle callback when chart inner params changed and affected to other widgets,
     * for ex. to external set param (param on selector) by table cell click
     */
    const handleChangeCallback = React.useCallback(
        (changedProps) => {
            if (changedProps.type === 'PARAMS_CHANGED') {
                onStateAndParamsChange({params: changedProps.data.params || {}});
            }
        },
        [onStateAndParamsChange],
    );

    /**
     * handle callback when chart was loaded and we know it's type for autoHeight adjust call
     */
    const handleChartLoad = React.useCallback(
        ({data, status}: ChartKitWrapperOnLoadProps) => {
            if (
                status === 'error' ||
                (data?.loadedData as unknown as AxiosResponse<ResponseError>)?.data?.error
            ) {
                adjustLayout(false);
                return;
            }
            const newAutoHeight = Boolean(props.data.autoHeight);
            // fix same as for table at CHARTS-7640
            if (widgetType === DashTabItemControlSourceType.External) {
                setTimeout(() => {
                    adjustLayout(!newAutoHeight);
                }, WIDGET_DEBOUNCE_TIMEOUT);
            } else {
                adjustLayout(!newAutoHeight);
            }
        },
        [adjustLayout, widgetType, props.data.autoHeight],
    );

    const {
        loadedData,
        isLoading,
        isSilentReload,
        isReloadWithNoVeil,
        error,
        handleChartkitReflow,
        handleChange,
        handleError,
        handleRetry,
        loadChartData,
        setLoadingProps,
        setCanBeLoaded,
        isInit,
        dataProps,
        handleRenderChart,
        loadControls,
    } = useLoadingChart({
        dataProvider,
        initialData,
        requestId,
        requestCancellationRef,
        rootNodeRef,
        hasChangedOuterProps,
        hasChangedOuterParams,
        onChartLoad: handleChartLoad,
        onChartRender: handleRenderChartWidget,
        chartKitRef,
        resolveMetaDataRef,
        resolveWidgetDataRef,
        usedParamsRef,
        innerParamsRef,
        handleChangeCallback,
        widgetDataRef,
        usageType,
        widgetType,
    });

    const {
        mods,
        widgetBodyClassName,
        hasHiddenClassMod,
        veil,
        showLoader,
        showOverlayWithControlsOnEdit,
    } = React.useMemo(
        () =>
            getPreparedConstants({
                isLoading,
                error,
                loadedData,
                isReloadWithNoVeil,
                noLoader,
                noVeil,
                isSilentReload,
                history,
                widgetId,
            }),
        [
            isLoading,
            error,
            loadedData,
            isReloadWithNoVeil,
            noLoader,
            noVeil,
            compactLoader,
            loaderDelay,
            history.location.search,
        ],
    );

    /**
     * debounced call of chartkit reflow
     */
    const debouncedChartReflow = React.useCallback(
        debounce(handleChartkitReflow, WIDGET_RESIZE_DEBOUNCE_TIMEOUT),
        [handleChartkitReflow],
    );

    /**
     * get dash widget meta data (new relations feature-flag)
     */
    const getCurrentWidgetResolvedMetaInfo = React.useCallback(
        (loadData: ResolveWidgetControlDataRefArgs | null) => {
            const meta = getWidgetSelectorMeta({
                loadedData: loadData,
                id: widgetId,
                chartId,
                error,
            });

            if (resolveMetaDataRef.current) {
                resolveMetaDataRef.current(meta);
            }
        },
        [resolveMetaDataRef.current, loadedData, widgetId, chartId, error],
    );

    /**
     * get dash widget meta data (current relations)
     */
    const resolveMeta = React.useCallback(
        (loadedData: ResolveWidgetControlDataRefArgs | null) => {
            const meta = getWidgetSelectorMetaOld({
                id: widgetId,
                chartId,
                loadedData,
            });

            if (resolveMetaDataRef.current) {
                resolveMetaDataRef.current(meta);
            }
        },
        [resolveMetaDataRef.current, widgetId, chartId],
    );

    /**
     * get dash widget meta info (used for relations)
     */
    const handleGetWidgetMeta = React.useCallback(
        (argResolve) => {
            resolveMetaDataRef.current = argResolve;
            resolveWidgetDataRef.current = (
                resolvingData: ResolveWidgetControlDataRefArgs | null,
            ) => {
                if (Utils.isEnabledFeature(Feature.ShowNewRelations) && isNewRelations) {
                    getCurrentWidgetResolvedMetaInfo(resolvingData);
                } else {
                    resolveMeta(resolvingData);
                }
            };
            if (!isInit) {
                // initializing chart loading if it was not inited yet (ex. was not in viewport
                setCanBeLoaded(true);
            }
            // do not resolve Promise for collecting meta info until chart loaded (for relations dialog)
            if (!loadedData) {
                // resolve if no loaded data but get error
                if (error) {
                    resolveWidgetDataRef.current(null);
                }
                return;
            }
            resolveWidgetDataRef.current(loadedData as ResolveWidgetControlDataRefArgs);
        },
        [
            error,
            loadedData,
            isNewRelations,
            setCanBeLoaded,
            isInit,
            resolveMeta,
            getCurrentWidgetResolvedMetaInfo,
            resolveMetaDataRef,
            resolveWidgetDataRef,
        ],
    );

    /**
     * changed widget content size
     */
    React.useEffect(() => {
        debouncedChartReflow();
    }, [width, height, debouncedChartReflow]);

    return {
        loadedData,
        isLoading,
        isSilentReload,
        isReloadWithNoVeil,
        error,
        handleChartkitReflow,
        handleChange,
        handleError,
        handleRetry,
        handleGetWidgetMeta,
        mods,
        widgetBodyClassName,
        hasHiddenClassMod,
        veil,
        showLoader,
        loadChartData,
        setLoadingProps,
        showOverlayWithControlsOnEdit,
        dataProps,
        handleRenderChart,
        getControls: loadControls,
    };
};
