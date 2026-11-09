import app from 'flarum/admin/app';
import Button from 'flarum/common/components/Button';

import PurgeModal from './components/PurgeModal';

const ID = 'peopleinside-restricted-visibility';

app.initializers.add(ID, () => {
  app.extensionData
    .for(ID)
    .registerPermission(
      {
        icon: 'fas fa-eye-slash',
        label: app.translator.trans(ID + '.admin.permissions.restrict'),
        permission: ID + '.restrict',
      },
      'reply'
    )
    .registerPermission(
      {
        icon: 'fas fa-user-shield',
        label: app.translator.trans(ID + '.admin.permissions.view_all'),
        permission: ID + '.viewAll',
      },
      'moderate'
    )
    .registerSetting(function () {
      return (
        <div className="Form-group">
          <label>{app.translator.trans(ID + '.admin.danger.title')}</label>
          <div className="helpText">{app.translator.trans(ID + '.admin.danger.help')}</div>
          <Button className="Button Button--danger" icon="fas fa-trash" onclick={() => app.modal.show(PurgeModal)}>
            {app.translator.trans(ID + '.admin.danger.button')}
          </Button>
        </div>
      );
    });
});
