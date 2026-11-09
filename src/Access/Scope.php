<?php

namespace PeopleInside\RestrictedVisibility\Access;

use PeopleInside\RestrictedVisibility\Constants;
use PeopleInside\RestrictedVisibility\Db;
use PeopleInside\RestrictedVisibility\GroupIds;
use Flarum\User\User;

final class Scope
{
    /** Nessuna restrizione per amministratori e per chi ha il permesso di bypass. */
    public static function bypasses(User $actor): bool
    {
        return $actor->isAdmin() || $actor->hasPermission(Constants::PERM_VIEW_ALL);
    }

    /**
     * Aggiunge le condizioni (raggruppate, quindi in AND con tutti gli altri scope) per
     * il modello $kind ('post' | 'discussion') la cui tabella è $table.
     *
     * Visibile se: non esistono restrizioni, OPPURE l'utente ha un gruppo elencato,
     * OPPURE è un utente elencato, OPPURE è l'autore.
     */
    public static function conditions($q, User $actor, string $kind, string $table): void
    {
        $t = Db::TABLES[$kind];
        $fk = $t['fk'];
        $groupIds = GroupIds::for($actor);
        $userId = (int) $actor->id;

        $q->where(function ($open) use ($t, $table, $fk) {
            $open->whereNotExists(function ($s) use ($t, $table, $fk) {
                $s->selectRaw('1')->from($t['groups'].' as g')->whereColumn('g.'.$fk, $table.'.id');
            })->whereNotExists(function ($s) use ($t, $table, $fk) {
                $s->selectRaw('1')->from($t['users'].' as u')->whereColumn('u.'.$fk, $table.'.id');
            });
        })->orWhereExists(function ($s) use ($t, $table, $fk, $groupIds) {
            $s->selectRaw('1')->from($t['groups'].' as g')
                ->whereColumn('g.'.$fk, $table.'.id')
                ->whereIn('g.group_id', $groupIds);
        });

        if ($userId > 0) {
            $q->orWhereExists(function ($s) use ($t, $table, $fk, $userId) {
                $s->selectRaw('1')->from($t['users'].' as u')
                    ->whereColumn('u.'.$fk, $table.'.id')
                    ->where('u.user_id', $userId);
            })->orWhere($table.'.user_id', $userId);
        }
    }
}
