import React from 'react';

import {FormRow} from '@gravity-ui/components';
import {Checkbox, TextInput} from '@gravity-ui/uikit';
import block from 'bem-cn-lite';
import {FieldWrapper} from 'components/FieldWrapper/FieldWrapper';
import {I18n} from 'i18n';
import {useDispatch, useSelector} from 'react-redux';
import {ControlQA} from 'shared';
import {setSelectorDialogItem} from 'units/dash/store/actions/dashTyped';
import {
    selectIsDatasetSelectorAndNoFieldSelected,
    selectSelectorDialog,
} from 'units/dash/store/selectors/dashTypedSelectors';

import '../../AppearanceSection.scss';

const b = block('control2-appearance-section');

const i18n = I18n.keyset('dash.control-dialog.edit');

export const TitleRow = () => {
    const dispatch = useDispatch();
    const {showTitle, title, validation} = useSelector(selectSelectorDialog);
    const isFieldDisabled = useSelector(selectIsDatasetSelectorAndNoFieldSelected);

    const handleTitleUpdate = React.useCallback((title: string) => {
        dispatch(
            setSelectorDialogItem({
                title,
                isManualTitle: true,
            }),
        );
    }, []);

    const handleShowTitleUpdate = React.useCallback((value: boolean) => {
        dispatch(
            setSelectorDialogItem({
                showTitle: value,
            }),
        );
    }, []);

    return (
        <FormRow label={i18n('field_title')}>
            <div className={b('operation-container')}>
                <Checkbox
                    disabled={isFieldDisabled}
                    className={b('operation-checkbox')}
                    qa={ControlQA.showLabelCheckbox}
                    checked={showTitle}
                    onUpdate={handleShowTitleUpdate}
                    size="l"
                />
                <FieldWrapper error={validation.title}>
                    <TextInput
                        disabled={isFieldDisabled}
                        qa={ControlQA.inputNameControl}
                        value={title}
                        onUpdate={handleTitleUpdate}
                    />
                </FieldWrapper>
            </div>
        </FormRow>
    );
};
