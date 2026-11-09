<?php

namespace PeopleInside\RestrictedVisibility\Console;

use PeopleInside\RestrictedVisibility\Constants;
use PeopleInside\RestrictedVisibility\Purge\Purger;
use Flarum\Console\AbstractCommand;
use Flarum\Group\Group;
use Flarum\User\User;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Question\Question;

class PurgeCommand extends AbstractCommand
{
    public function __construct(protected Purger $purger)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->setName(Constants::ID.':purge')
            ->setDescription('Purge all visibility restrictions, permissions, and settings.')
            ->addOption('mode', 'm', InputOption::VALUE_REQUIRED, 'What to do with restricted content: hide | delete | public', 'hide')
            ->addOption('actor', null, InputOption::VALUE_REQUIRED, 'User ID recorded as the author of the hiding action (default: first admin)')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show summary only, without modifying any data')
            ->addOption('yes', 'y', InputOption::VALUE_NONE, 'Do not prompt for confirmation (for scripts)');
    }

    protected function fire(): int
    {
        $mode = (string) $this->input->getOption('mode');
        if (! in_array($mode, Constants::MODES, true)) {
            $this->output->writeln('<error>Invalid mode. Use: hide, delete, or public.</error>');

            return self::FAILURE;
        }

        $p = $this->purger->preview();
        $this->output->writeln(sprintf(
            "Restricted content: %d discussions, %d posts. Links: %d groups, %d users.\nMode: <info>%s</info>",
            $p['discussions'], $p['posts'], $p['groupLinks'], $p['userLinks'], $mode
        ));

        if ($this->input->getOption('dry-run')) {
            $this->output->writeln('Dry-run: no changes were made.');

            return self::SUCCESS;
        }

        if ($mode === 'public') {
            $this->output->writeln('<comment>WARNING: previously restricted content will become visible to everyone.</comment>');
        } elseif ($mode === 'delete') {
            $this->output->writeln('<comment>WARNING: restricted content will be PERMANENTLY deleted.</comment>');
        }
        $this->output->writeln('This operation is irreversible. Please backup your database first.');

        if (! $this->input->getOption('yes')) {
            if (! $this->input->isInteractive()) {
                $this->output->writeln('<error>Non-interactive terminal: use --yes to confirm.</error>');

                return self::FAILURE;
            }
            $answer = $this->getHelper('question')->ask(
                $this->input, $this->output,
                new Question(sprintf('Type %s to proceed: ', Constants::CONFIRM_WORD))
            );
            if (! is_string($answer) || ! in_array(strtoupper(trim($answer)), Constants::CONFIRM_WORDS, true)) {
                $this->output->writeln('Cancelled.');

                return self::FAILURE;
            }
        }

        $actor = $this->resolveActor();
        $report = $this->purger->purge($mode, $actor);

        $this->output->writeln(sprintf(
            '<info>Done.</info> Affected discussions: %d, affected posts: %d.',
            $report['affectedDiscussions'], $report['affectedPosts']
        ));
        $this->output->writeln('Now disable the extension, then click "Delete data" in the admin dashboard (or run migrate:reset) to drop the tables.');

        return self::SUCCESS;
    }

    private function resolveActor(): ?User
    {
        $id = $this->input->getOption('actor');
        if ($id !== null && ctype_digit((string) $id)) {
            return User::find((int) $id);
        }

        return User::query()->whereHas('groups', fn ($q) => $q->where('groups.id', Group::ADMINISTRATOR_ID))->orderBy('id')->first();
    }
}
