import Extend from 'flarum/common/extenders';
import app from 'flarum/admin/app';
import Button from 'flarum/common/components/Button';
import PurgeModal from './components/PurgeModal';

const ID = 'peopleinside-restricted-visibility';

export default [
  new Extend.Admin()
    .permission(
      () => ({
        icon: 'fas fa-eye-slash',
        label: app.translator.trans(ID + '.admin.permissions.restrict'),
        permission: ID + '.restrict',
      }),
      'reply'
    )
    .permission(
      () => ({
        icon: 'fas fa-user-shield',
        label: app.translator.trans(ID + '.admin.permissions.view_all'),
        permission: ID + '.viewAll',
      }),
      'moderate'
    )
    .setting(
      () =>
        function () {
          return (
            <div className="Form-group">
              <label>{app.translator.trans(ID + '.admin.danger.title')}</label>
              <div className="helpText">{app.translator.trans(ID + '.admin.danger.help')}</div>
              <Button className="Button Button--danger" icon="fas fa-trash" onclick={() => app.modal.show(PurgeModal)}>
                {app.translator.trans(ID + '.admin.danger.button')}
              </Button>
            </div>
          );
        }
    ),
];
