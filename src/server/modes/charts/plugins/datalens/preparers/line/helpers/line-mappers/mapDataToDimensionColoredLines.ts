import {DATASET_FIELD_TYPES} from '../../../../../../../../../shared';
import {COLOR_SHAPE_SEPARATOR} from '../../../../utils/constants';
import {formatDate, getFieldTitle} from '../../../../utils/misc-helpers';
import {ItemValues} from '../types';
import {getItemsValues, getLineKey} from '../utils';

import {getColoredLineLegendTitle} from './getColoredLineLegendTitle';
import {
    ColorAndShapesValues,
    GetColorAndShapeValuesArgs,
    GetFieldTitleForValueArgs,
    MapDataToDimensionColoredLinesArgs,
} from './types';

const getFieldTitleForValue = ({hasField, defaultValue, yItem}: GetFieldTitleForValueArgs) => {
    if (hasField) {
        return getFieldTitle(yItem);
    }

    return defaultValue;
};

const getColorAndShapeValues = ({
    yItem,
    formattedValue,
    combinedValue,
}: GetColorAndShapeValuesArgs): ColorAndShapesValues => {
    const [colorValue, shapeValue] = combinedValue?.split(COLOR_SHAPE_SEPARATOR) || [];

    if (colorValue && shapeValue) {
        return {
            colorValue,
            shapeValue,
        };
    }

    const colorAndShapeValues: {colorValue?: string; shapeValue?: string} = {};

    const hasColors = Boolean(colorValue);
    const hasShapes = Boolean(shapeValue);

    const hasField = hasColors || hasShapes;

    colorAndShapeValues.colorValue =
        colorValue || getFieldTitleForValue({yItem, hasField, defaultValue: formattedValue});
    colorAndShapeValues.shapeValue =
        shapeValue || getFieldTitleForValue({yItem, hasField, defaultValue: formattedValue});

    return colorAndShapeValues;
};

export const mapDataToDimensionColoredLines = ({
    items,
    idToTitle,
    values,
    order,
    x2,
    x2IsDate,
    x2Value,
    xValue,
    multiaxis,
    shownTitle,
    lines,
    seriesOptions,
    x2DataType,
    yValue,
    yItem,
    hasColors,
    isItemsAreEqual,
    segmentName,
    layers,
}: MapDataToDimensionColoredLinesArgs) => {
    const mappedItemsToValues = items.map((item) => {
        return getItemsValues(item, {idToTitle, values, order});
    });

    let itemValues: ItemValues;
    if (isItemsAreEqual) {
        itemValues = {
            ...mappedItemsToValues[0],
        };
    } else {
        itemValues = mappedItemsToValues.reduce(
            (acc: ItemValues, curr, index) => {
                let {value, formattedValue} = curr;
                let extraValue = formattedValue;
                if (index !== items.length - 1) {
                    value = `${value}-`;
                    formattedValue = `${formattedValue}-`;
                    extraValue = `${extraValue}${COLOR_SHAPE_SEPARATOR}`;
                } else if (!hasColors) {
                    extraValue = `${COLOR_SHAPE_SEPARATOR}${extraValue}`;
                }
                return {
                    ...acc,
                    value: `${acc.value}${value}`,
                    formattedValue: `${acc.formattedValue}${formattedValue}`,
                    extraValue: `${acc.extraValue}${extraValue}`,
                };
            },
            {value: '', formattedValue: '', extraValue: ''} as ItemValues,
        );
    }

    const key = getLineKey({
        shownTitle,
        x2AxisValue: x2Value,
        isX2Axis: Boolean(x2),
        isMultiAxis: multiaxis,
        value: String(itemValues.value),
        segmentName,
    });

    if (!lines[key]) {
        lines[key] = {
            data: {},
            ...seriesOptions,
        };

        const line = lines[key];

        if (x2) {
            line.stack = x2Value;

            // Exactly ==
            // eslint-disable-next-line eqeqeq
            if (itemValues.value == x2Value) {
                line.title = String(itemValues.formattedValue);
                line.formattedName = String(itemValues.formattedValue);
            } else {
                if (x2IsDate) {
                    x2Value = formatDate({
                        valueType: x2DataType as DATASET_FIELD_TYPES,
                        value: x2Value,
                        format: x2.format,
                    });
                }

                line.title = `${itemValues.formattedValue}: ${x2Value}`;
                line.legendTitle = `${itemValues.formattedValue}`;
                line.formattedName = `${itemValues.formattedValue}: ${x2Value}`;
                line.drillDownFilterValue = String(itemValues.value);
            }
        } else if (multiaxis) {
            line.title = `${itemValues.formattedValue}: ${shownTitle}`;
            line.formattedName = `${itemValues.formattedValue}: ${shownTitle}`;
            line.drillDownFilterValue = String(itemValues.value);
        } else {
            line.title = String(itemValues.formattedValue);
            line.formattedName = String(itemValues.formattedValue);
            line.drillDownFilterValue = String(itemValues.value);

            line.legendTitle = getColoredLineLegendTitle({
                yItem,
                colorItem: items[0],
                formattedValue: String(itemValues.formattedValue),
                layers,
            });
        }

        const {colorValue, shapeValue} = getColorAndShapeValues({
            yItem,
            formattedValue: String(itemValues.formattedValue),
            combinedValue: itemValues.extraValue,
        });

        line.colorValue = colorValue;
        line.shapeValue = shapeValue;
    }

    const lastKey = typeof xValue === 'undefined' ? shownTitle : xValue;

    lines[key].data[lastKey as string | number] = {value: yValue};

    return {key, lastKey};
};
