import React from 'react';

import {Loader} from '@gravity-ui/uikit';
import block from 'bem-cn-lite';
import {I18n} from 'i18n';

import {DashkitMetaDataItem, RelationType} from '../../types';

import {Row} from './Row';

import './Content.scss';

const b = block('dialog-relations-content');
const i18n = I18n.keyset('component.dialog-relations.view');

type ContentProps = {
    relations: Array<DashkitMetaDataItem>;
    widgetMeta: DashkitMetaDataItem | null;
    isLoading: boolean;
    onChange: (props: {type: RelationType; widgetId: DashkitMetaDataItem['widgetId']}) => void;
    onAliasClick: (props: any) => void; // TODO next PR
    showDebugInfo: boolean;
};

export const Content = ({
    relations,
    widgetMeta,
    isLoading,
    onChange,
    onAliasClick,
    showDebugInfo,
}: ContentProps) => {
    if (isLoading) {
        return (
            <div className={b()}>
                <div className={b('loader-wrap')}>
                    <Loader className={b('loader')} />
                </div>
            </div>
        );
    }

    if (!relations.length) {
        return <div className={b('empty-text')}>{i18n('label_no-connections')}</div>;
    }

    if (!widgetMeta) {
        return <div className={b('empty-text')}>{i18n('label_no-widget-info')}</div>;
    }

    const content = relations.map((item, index) => (
        <Row
            data={item}
            key={`relations-row-${item.widgetId}-${index}`}
            widgetMeta={widgetMeta}
            onChange={onChange}
            onAliasClick={onAliasClick}
            showDebugInfo={showDebugInfo}
        />
    ));

    return (
        <div className={b()}>
            {Boolean(relations.length) && (
                <div className={b('items')}>
                    <div className={b('row', 'top')}>
                        <div className={b('left', 'top')}>{i18n('label_widget')}</div>
                        <div className={b('right', 'top')}>{i18n('label_relation-type')}</div>
                    </div>
                    {content}
                </div>
            )}
        </div>
    );
};
