import React from 'react';

import {Checkbox, Dialog, Select} from '@gravity-ui/uikit';
import block from 'bem-cn-lite';
import {I18n} from 'i18n';
import {ChartkitMenuDialogsQA} from 'shared';
import {URL_OPTIONS as COMMON_URL_OPTIONS} from 'ui/constants';
import {ChartKitProps} from 'ui/libs/DatalensChartkit/components/ChartKitBase/ChartKitBase';
import {URL_OPTIONS as CHARTKIT_URL_OPTIONS} from 'ui/libs/DatalensChartkit/modules/constants/constants';
import {ChartsData, ChartsProps} from 'ui/libs/DatalensChartkit/modules/data-provider/charts';
import URI from 'ui/libs/DatalensChartkit/modules/uri/uri';
import {Widget} from 'ui/libs/DatalensChartkit/types';

import DialogManager from '../DialogManager/DialogManager';

import {MarkupShareLink} from './MarkupShareLink/MarkupShareLink';
import {ShareLink} from './ShareLink/ShareLink';

import './DialogShare.scss';

const i18n = I18n.keyset('component.dialog-share.view');
export const DIALOG_SHARE = Symbol('DIALOG_SHARE');

const languageOptions = [
    {content: i18n('value_language-auto'), value: ''},
    {content: i18n('value_language-rus'), value: 'ru'},
    {content: i18n('value_language-eng'), value: 'en'},
];

const themeOptions = [
    {content: i18n('value_theme-auto'), value: ''},
    {content: i18n('value_theme-dark'), value: 'dark'},
    {content: i18n('value_theme-light'), value: 'light'},
];

const b = block('dialog-share');

type DialogShareProps = {
    onClose: () => void;
    showLinkDescription?: boolean;
    showMarkupLink?: boolean;
    propsData: ChartKitProps<ChartsProps, ChartsData>;
    showHideComments?: boolean;
    loadedData?: Widget & ChartsData;
    urlIdPrefix?: string;
    initialParams?: Record<string, number>;
    hasDefaultSize?: boolean;
};

const getInitialLink = (
    loadedData: (Widget & ChartsData) | {},
    propsData: ChartKitProps<ChartsProps, ChartsData>,
    idPrefix = '/',
    initialParams = {
        [COMMON_URL_OPTIONS.EMBEDDED]: 1,
    },
): URI => {
    const id = (loadedData && 'entryId' in loadedData && loadedData.entryId) || propsData.id;
    const locationUrl = location.origin + (id ? idPrefix + id : propsData.source);

    const initialLink = new URI(locationUrl);
    initialLink.setParams({...propsData.params, ...initialParams});
    return initialLink;
};

export const DialogShare: React.FC<DialogShareProps> = ({
    onClose,
    showLinkDescription,
    showMarkupLink,
    showHideComments,
    loadedData = {},
    propsData,
    urlIdPrefix,
    initialParams = {},
    hasDefaultSize,
}) => {
    const [currentUrl, setCurrentUrl] = React.useState(
        getInitialLink(loadedData, propsData, urlIdPrefix, initialParams),
    );
    const [selectedTheme, setSelectedTheme] = React.useState('');
    const [selectedLang, setSelectedLang] = React.useState('');
    const [hideMenu, setHideMenu] = React.useState(
        Boolean(initialParams[COMMON_URL_OPTIONS.NO_CONTROLS]),
    );
    const [hideComments, setHideComments] = React.useState(
        Boolean(initialParams[CHARTKIT_URL_OPTIONS.HIDE_COMMENTS]),
    );

    const defaultSize = hasDefaultSize ? ' width="100%" height="400px"' : '';

    const getLink = React.useCallback(() => currentUrl.toString(), [currentUrl]);
    const getHTML = React.useCallback(
        () => `<iframe frameborder="0" src="${getLink()}"${defaultSize}></iframe>`,
        [getLink, defaultSize],
    );

    React.useEffect(() => {
        setCurrentUrl((paramsUrl: URI) => {
            const updatedLink = new URI(paramsUrl.toString());
            updatedLink.updateParams({
                [COMMON_URL_OPTIONS.LANGUAGE]: selectedLang || null,
                [COMMON_URL_OPTIONS.THEME]: selectedTheme || null,
                [CHARTKIT_URL_OPTIONS.HIDE_COMMENTS]: hideComments ? 1 : null,
                [COMMON_URL_OPTIONS.NO_CONTROLS]: hideMenu ? 1 : null,
            });

            return updatedLink;
        });
    }, [selectedLang, selectedTheme, hideMenu, hideComments]);

    const handleChangeMenuParam = () => setHideMenu(!hideMenu);
    const handleChangeCommentsParam = () => setHideComments(!hideComments);
    const handleChangeLang = (values: string[]) => setSelectedLang(values[0]);
    const handleChangeTheme = (values: string[]) => setSelectedTheme(values[0]);

    return (
        <Dialog onClose={onClose} open={true} className={b()}>
            <Dialog.Header caption={i18n('title_share')} />
            <Dialog.Body>
                <div className={b('body')} data-qa={ChartkitMenuDialogsQA.chartMenuShareModalBody}>
                    <div className={b('params')}>
                        <div className={b('subheader')}>{i18n('label_params')}</div>
                        <div className={b('description')}>{i18n('label_params-description')}</div>

                        <div className={b('checkboxes')}>
                            <Checkbox checked={hideMenu} onChange={handleChangeMenuParam}>
                                {i18n('value_hide-menu')}
                            </Checkbox>
                            {showHideComments && (
                                <Checkbox
                                    checked={hideComments}
                                    onChange={handleChangeCommentsParam}
                                >
                                    {i18n('value_hide-comments')}
                                </Checkbox>
                            )}
                        </div>
                        <div className={b('selects')}>
                            <Select
                                value={[selectedLang]}
                                onUpdate={handleChangeLang}
                                options={languageOptions}
                                label={i18n('field_language')}
                            />
                            <Select
                                value={[selectedTheme]}
                                onUpdate={handleChangeTheme}
                                options={themeOptions}
                                label={i18n('field_theme')}
                            />
                        </div>
                    </div>
                    <div className={b('links')}>
                        <ShareLink
                            title={i18n('label_link')}
                            description={i18n('label_link-description')}
                            text={getLink()}
                            showDescription={showLinkDescription}
                        />
                        {showMarkupLink && (
                            <MarkupShareLink
                                getLink={getLink}
                                showDescription={showLinkDescription}
                                defaultSize={defaultSize}
                            />
                        )}
                        <ShareLink
                            title={i18n('label_iframe')}
                            description={i18n('label_iframe-description')}
                            text={getHTML()}
                            showDescription={showLinkDescription}
                        />
                    </div>
                </div>
            </Dialog.Body>
        </Dialog>
    );
};

DialogManager.registerDialog(DIALOG_SHARE, DialogShare);
