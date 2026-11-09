import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Model from 'flarum/common/Model';
import Discussion from 'flarum/common/models/Discussion';
import Post from 'flarum/common/models/Post';
import Badge from 'flarum/common/components/Badge';
import Button from 'flarum/common/components/Button';
import TextEditor from 'flarum/common/components/TextEditor';
import PostControls from 'flarum/forum/utils/PostControls';
import DiscussionControls from 'flarum/forum/utils/DiscussionControls';

import VisibilityModal from './components/VisibilityModal';

const ID = 'peopleinside-restricted-visibility';

app.initializers.add(ID, () => {
  // ---- modelli
  for (const Klass of [Discussion, Post]) {
    if (Klass?.prototype) {
      Klass.prototype.isRestricted = Model.attribute('isRestricted');
      Klass.prototype.canRestrictVisibility = Model.attribute('canRestrictVisibility');
      Klass.prototype.restrictedGroupIds = Model.attribute('restrictedGroupIds');
      Klass.prototype.restrictedUsers = Model.attribute('restrictedUsers');
    }
  }
  if (Discussion?.prototype) {
    Discussion.prototype.restrictedPostCount = Model.attribute('restrictedPostCount');
  }

  const canUse = () => !!app.forum.attribute('peopleinsideCanRestrictVisibility');

  // ---- badge sulle discussioni (elenco e testata). Icona diversa dal lucchetto della discussione bloccata.
  if (Discussion?.prototype) {
    extend(Discussion.prototype, 'badges', function (badges) {
      const whole = this.isRestricted?.();
      const count = this.restrictedPostCount?.() || 0;
      if (!whole && !count) return;

      badges.add(
        'restricted',
        <Badge
          type="restricted"
          icon="fas fa-eye-slash"
          label={app.translator.trans(ID + (whole ? '.forum.badge.discussion' : '.forum.badge.posts'), { count })}
        />,
        5
      );
    });
  }

  // ---- etichetta sui post riservati (Flarum 2.0: modulo asincrono/stringa)
  extend('flarum/forum/components/CommentPost', 'headerItems', function (items) {
    const post = this.attrs?.post;
    if (!post?.isRestricted?.()) return;

    const names = [];
    (post.restrictedGroupIds?.() || []).forEach((id) => {
      const g = app.store.getById('groups', String(id));
      if (g) names.push(g.namePlural());
    });
    (post.restrictedUsers?.() || []).forEach((u) => names.push('@' + u.name));

    const label = names.length
      ? app.translator.trans(ID + '.forum.post.restricted_to', { names: names.join(', ') })
      : app.translator.trans(ID + '.forum.post.restricted');

    items.add(
      'peopleinside-restricted',
      <span className="Post-restricted" title={label}>
        <i className="fas fa-eye-slash" /> {label}
      </span>,
      -10
    );
  });

  // ---- pulsante nel TextEditor del composer
  if (TextEditor?.prototype) {
    extend(TextEditor.prototype, 'controlItems', function (items) {
      if (!canUse() || !app.composer?.isVisible?.() || !app.composer?.fields) return;

      const f = app.composer.fields;
      const active = (f.restrictedGroupIds || []).length + (f.restrictedUserIds || []).length > 0;

      items.add(
        'peopleinside-restrict',
        <Button
          icon="fas fa-eye-slash"
          className={'Button Button--icon' + (active ? ' Button--restricted' : '')}
          aria-label={app.translator.trans(ID + '.forum.composer.button')}
          title={app.translator.trans(ID + '.forum.composer.button')}
          onclick={() =>
            app.modal.show(VisibilityModal, {
              groupIds: f.restrictedGroupIds || [],
              users: f.restrictedUsers || [],
              onsave: (groupIds, users) => {
                f.restrictedGroupIds = groupIds;
                f.restrictedUsers = users;
                f.restrictedUserIds = users.map((u) => u.id);
                m.redraw();
              },
            })
          }
        />,
        5
      );
    });
  }

  const addData = function (data) {
    const f = app.composer?.fields;
    if (!f) return;
    if (f.restrictedGroupIds !== undefined || f.restrictedUserIds !== undefined) {
      data.restrictedGroupIds = f.restrictedGroupIds || [];
      data.restrictedUserIds = f.restrictedUserIds || [];
    }
  };

  // In Flarum 2.0 i composer sono moduli lazy-loaded: si estendono passando il path modulo come stringa
  extend('flarum/forum/components/DiscussionComposer', 'data', addData);
  extend('flarum/forum/components/ReplyComposer', 'data', addData);
  extend('flarum/forum/components/EditPostComposer', 'data', addData);

  // In modifica, precompila con i valori attuali
  extend('flarum/forum/components/EditPostComposer', 'oninit', function () {
    const post = this.attrs?.post;
    if (!post?.canRestrictVisibility?.()) return;
    const f = this.attrs?.composer?.fields;
    if (!f) return;
    f.restrictedGroupIds = (post.restrictedGroupIds?.() || []).map(String);
    f.restrictedUsers = post.restrictedUsers?.() || [];
    f.restrictedUserIds = f.restrictedUsers.map((u) => u.id);
  });

  // ---- menu del post / della discussione
  const openFor = (model) =>
    app.modal.show(VisibilityModal, {
      groupIds: model.restrictedGroupIds?.() || [],
      users: model.restrictedUsers?.() || [],
      onsave: (groupIds, users) =>
        model
          .save({ restrictedGroupIds: groupIds, restrictedUserIds: users.map((u) => u.id) })
          .then(() => m.redraw())
          .catch(() => {}),
    });

  if (PostControls) {
    extend(PostControls, 'moderationControls', function (items, post) {
      if (!post?.canRestrictVisibility?.()) return;
      items.add(
        'peopleinside-restrict',
        <Button icon="fas fa-eye-slash" onclick={() => openFor(post)}>
          {app.translator.trans(ID + '.forum.controls.restrict')}
        </Button>
      );
    });
  }

  if (DiscussionControls) {
    extend(DiscussionControls, 'moderationControls', function (items, discussion) {
      if (!discussion?.canRestrictVisibility?.()) return;
      items.add(
        'peopleinside-restrict',
        <Button icon="fas fa-eye-slash" onclick={() => openFor(discussion)}>
          {app.translator.trans(ID + '.forum.controls.restrict')}
        </Button>
      );
    });
  }
});
