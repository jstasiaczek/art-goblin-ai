import { Modal, Form, Input, Select } from 'antd';
import type { FormInstance } from 'antd/es/form';

export type AddUserFormValues = { email: string; password: string; role: 'admin' | 'user' };

type AddUserModalProps = {
    open: boolean;
    form: FormInstance<AddUserFormValues>;
    loading?: boolean;
    onSubmit: () => void;
    onCancel: () => void;
};

export const AddUserModal: React.FC<AddUserModalProps> = ({ open, form, loading, onSubmit, onCancel }) => (
    <Modal
        title="Add user"
        open={open}
        onOk={onSubmit}
        onCancel={onCancel}
        okText="Create"
        confirmLoading={loading}
        destroyOnHidden
    >
        <Form form={form} layout="vertical">
            <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, message: 'Enter email' }]}
            >
                <Input placeholder="e.g. user@test.com" />
            </Form.Item>
            <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Enter password' }, { min: 8, message: 'Min. 8 characters' }]}
            >
                <Input.Password placeholder="Password" />
            </Form.Item>
            <Form.Item name="role" label="Role" initialValue="user">
                <Select options={[{ label: 'user', value: 'user' }, { label: 'admin', value: 'admin' }]} />
            </Form.Item>
        </Form>
    </Modal>
);
