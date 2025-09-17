import { Modal, Input, Select } from 'antd';

type Option = { value: string; label: string };

type EditSceneModalProps = {
    open: boolean;
    name: string;
    groupUuid: string;
    options: Option[];
    loading?: boolean;
    onChangeName: (value: string) => void;
    onChangeGroup: (value: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
};

export const EditSceneModal: React.FC<EditSceneModalProps> = ({
    open,
    name,
    groupUuid,
    options,
    loading,
    onChangeName,
    onChangeGroup,
    onSubmit,
    onCancel,
}) => (
    <Modal
        title="Edit scene"
        open={open}
        onOk={onSubmit}
        onCancel={onCancel}
        confirmLoading={loading}
        okText="Save"
        cancelText="Cancel"
        destroyOnHidden
    >
        <Input
            value={name}
            onChange={(event) => onChangeName(event.target.value)}
            onPressEnter={onSubmit}
            placeholder="New scene name"
        />
        <Select
            style={{ marginTop: 16, width: '100%' }}
            value={groupUuid}
            onChange={onChangeGroup}
            options={options}
        />
    </Modal>
);

