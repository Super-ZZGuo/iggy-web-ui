<script lang="ts" context="module">
  type GlobalPermissionsSnakeCase = keyof KeysToSnakeCase<GlobalPermissions>;
  type StreamPermissionsSnakeCase = Exclude<keyof KeysToSnakeCase<StreamPermissions>, 'topics'>;

  type TopicsPerms = Record<
    Topic['id'],
    Record<keyof TopicPermissions, { name: string; checked: false }>
  >;

  type StreamsPerms = Record<
    Stream['id'],
    Record<
      StreamPermissionsSnakeCase,
      {
        name: string;
        checked: boolean;
        disabled: boolean;
        globalPermsKey: GlobalPermissionsSnakeCase;
      }
    > & { topicPerms: TopicsPerms }
  >;

  type GlobalPerms = Record<
    GlobalPermissionsSnakeCase,
    { name: string; checked: boolean; relatesTo?: StreamPermissionsSnakeCase }
  >;
</script>

<script lang="ts">
  import Icon from './Icon.svelte';
  import Combobox from './Combobox.svelte';
  import type { Stream } from '$lib/domain/Stream';
  import { topicMapper, type Topic } from '$lib/domain/Topic';
  import { fetchRouteApi } from '$lib/api/fetchRouteApi';
  import { showToast } from './AppToasts.svelte';
  import type { KeysToSnakeCase } from '$lib/utils/utilTypes';
  import type {
    GlobalPermissions,
    StreamPermissions,
    TopicPermissions
  } from '$lib/domain/Permissions';
  import Checkbox from './Checkbox.svelte';
  import { twMerge } from 'tailwind-merge';
  import { noTypeCheck } from '$lib/utils/noTypeCheck';
  import { fade } from 'svelte/transition';

  const formatSelected = (id: number, name: string) => {
    return { id, name: `id: ${id}, ${name}` };
  };

  export let streams: Stream[];

  let topics: Topic[] = [];
  let fetchingTopics = false;
  let selectedStream: { id: number; name: string } = formatSelected(streams[0].id, streams[0].name);
  let selectedTopic: { id: number; name: string } | undefined = undefined;

  const fetchTopics = async (id: number) => {
    fetchingTopics = true;
    const { data, ok } = await fetchRouteApi({
      method: 'GET',
      path: `/streams/${id}/topics`
    });

    if (!ok) {
      showToast({ type: 'error', description: 'Something went wrong' });
      return;
    }
    fetchingTopics = false;
    const newTopics = data.map(topicMapper) as Topic[];

    if (newTopics.length === 0) return;
    selectedTopic = formatSelected(newTopics[0].id, newTopics[0].name);
    topics = newTopics;
  };

  const buildTopicsPerms = (newTopics: Topic[]) => {
    const tempTopicPerms: TopicsPerms = {};

    if (Object.keys(streamsPerms[selectedStream.id].topicPerms).length > 0) {
      return;
    }

    newTopics.forEach((t) => {
      tempTopicPerms[t.id] = {
        manageTopic: {
          checked: false,
          name: 'Manage topic'
        },
        pollMessages: {
          checked: false,
          name: 'Poll messages'
        },
        readTopic: {
          checked: false,
          name: 'Read topic'
        },
        sendMessages: {
          checked: false,
          name: 'Send messages'
        }
      };
    });

    streamsPerms[selectedStream.id].topicPerms = tempTopicPerms;
    streamsPerms = streamsPerms;
  };

  const onGlobalPermChanged = (key: GlobalPermissionsSnakeCase, checked: boolean) => {
    const relatesTo = globalPerms[key].relatesTo;

    if (relatesTo) {
      Object.keys(streamsPerms).forEach((k) => {
        streamsPerms[k][relatesTo] = { ...streamsPerms[k][relatesTo], checked, disabled: checked };
        streamsPerms = streamsPerms;
      });
    }
  };

  const globalPerms: GlobalPerms = {
    manage_servers: {
      name: 'Manage servers',
      checked: false
    },
    read_servers: {
      name: 'Read servers',
      checked: false
    },
    manage_users: {
      name: 'Manage users',
      checked: false
    },
    read_users: {
      name: 'Read users',
      checked: false
    },
    manage_streams: {
      name: 'Manage streams',
      relatesTo: 'manage_stream',
      checked: false
    },
    read_streams: {
      name: 'Read streams',
      relatesTo: 'read_stream',
      checked: false
    },
    manage_topics: {
      name: 'Manage topics',
      relatesTo: 'manage_topics',
      checked: false
    },
    read_topics: {
      name: 'Read topics',
      relatesTo: 'read_topics',
      checked: false
    },
    poll_messages: {
      name: 'Pool messages',
      relatesTo: 'poll_messages',
      checked: false
    },
    send_messages: {
      name: 'Send messages',
      relatesTo: 'send_messages',
      checked: false
    }
  };

  let streamsPerms = (() => {
    const tempPerms: StreamsPerms = {};

    streams.forEach((s) => {
      tempPerms[s.id] = {
        manage_stream: {
          name: 'Manage stream',
          globalPermsKey: 'manage_streams',
          checked: false,
          disabled: false
        },
        read_stream: {
          name: 'Read stream',
          globalPermsKey: 'read_streams',
          checked: false,
          disabled: false
        },
        read_topics: {
          name: 'Read topics',
          globalPermsKey: 'read_topics',
          checked: false,
          disabled: false
        },
        poll_messages: {
          name: 'Poll messages',
          globalPermsKey: 'poll_messages',
          checked: false,
          disabled: false
        },
        send_messages: {
          name: 'Send messages',
          globalPermsKey: 'send_messages',
          checked: false,
          disabled: false
        },
        manage_topics: {
          name: 'Manage topics',
          globalPermsKey: 'manage_topics',
          checked: false,
          disabled: false
        },
        topicPerms: {}
      };
    });

    return tempPerms;
  })() satisfies StreamsPerms;

  $: fetchTopics(selectedStream.id);
  $: buildTopicsPerms(topics);

  $: tainedStreams = (() => {
    const tained: Set<number> = new Set([]);

    Object.keys(streamsPerms).forEach((streamId) => {
      Object.keys(streamsPerms[streamId]).forEach((permissionKey) => {
        if (permissionKey === 'topicPerms') {
          const perm = streamsPerms[streamId][permissionKey];

          Object.keys(perm).forEach((topicId) => {
            const topicPerm = perm[topicId];
            const isTopicTained = Object.keys(topicPerm)
              .map((k) => topicPerm[k])
              .some((p) => p.checked);

            if (isTopicTained) tained.add(streamId);
          });
        } else {
          const perm = streamsPerms[streamId][permissionKey];
          if (perm.checked && !perm.disabled) tained.add(streamId);
        }
      });
    });

    return Array.from(tained);
  })().map((tainedStreamId) => {
    const name = streams.find((stream) => stream.id === +tainedStreamId)!.name;
    return { name, id: +tainedStreamId };
  });
</script>

<h4 class="ml-1 text-lg text-color mt-7">Global permissions</h4>

<div class="grid grid-cols-4 mt-4">
  {#each Object.keys(globalPerms) as key (key)}
    <label
      class="flex gap-2 items-center text-color cursor-pointer"
      for={`global-permissions-${key}`}
    >
      <Checkbox
        bind:checked={globalPerms[key].checked}
        value={globalPerms[key].name}
        id={`global-permissions-${key}`}
        name={globalPerms[key].name}
        on:change={(e) => onGlobalPermChanged(key, noTypeCheck(e).target.checked)}
      />
      <span class="text-sm">{globalPerms[key].name}</span>
    </label>
  {/each}
</div>

<div class="flex gap-3 mt-4 items-center">
  <h4 class="text-lg text-color mr-2">Granular permissions</h4>

  {#each tainedStreams as { id, name } (id)}
    <button
      type="button"
      on:click={() => (selectedStream = formatSelected(id, name))}
      transition:fade={{ duration: 100 }}
      class={twMerge(
        'rounded-3xl px-3 py-1 whitespace-nowrap text-xs hover:shadow-lg  hover:ring-2 transition-all text-white ring-1 ring-green-500 shadow-md hover:cursor-pointer',
        selectedStream.id === id && 'bg-green-500'
      )}
      >id: {id}, {name}
    </button>
  {/each}
</div>

<div class="grid grid-cols-[1fr_auto_1fr] gap-5 mt-4">
  <div class="w-full flex flex-col">
    <Combobox
      items={streams.map((stream) => ({
        id: stream.id,
        name: `id: ${stream.id}, ${stream.name}`
      }))}
      label={`Stream`}
      bind:selectedValue={selectedStream}
    />

    <div class="grid grid-cols-2 mt-4">
      {#each Object.keys(streamsPerms[selectedStream.id]) as key (key)}
        {#if key !== 'topicPerms'}
          <label
            class={twMerge(
              'flex gap-2 items-center text-color cursor-pointer',
              streamsPerms[selectedStream.id][key].disabled && 'cursor-not-allowed text-shadeL800'
            )}
            for={`stream-${key}-permission`}
          >
            <Checkbox
              bind:checked={streamsPerms[selectedStream.id][key].checked}
              value={streamsPerms[selectedStream.id][key].name}
              disabled={streamsPerms[selectedStream.id][key].disabled}
              id={`stream-${key}-permission`}
            />
            <span class={twMerge('text-sm')}>{streamsPerms[selectedStream.id][key].name}</span>
          </label>
        {/if}
      {/each}
    </div>
  </div>

  <span class="h-[68px] w-[45px] flex flex-col justify-end">
    {#if selectedTopic}
      <div class="w-fit h-fit">
        <Icon name="chevronRight" class="h-[40px] dark:stroke-white mt-auto  w-auto" />
      </div>
    {/if}
  </span>

  <div class="w-full flex flex-col relative">
    {#if topics.length > 0 && selectedTopic && Object.keys(streamsPerms[selectedStream.id].topicPerms).length > 0}
      <div>
        <Combobox
          isLoading={fetchingTopics}
          items={topics.map((topic) => ({
            id: topic.id,
            name: `id: ${topic.id}, ${topic.name}`
          }))}
          label="Topic"
          bind:selectedValue={selectedTopic}
        />

        <div class="grid grid-cols-2 mt-4">
          {#each Object.keys(streamsPerms[selectedStream.id].topicPerms[selectedTopic.id]) as key (key)}
            <label class="flex gap-2 items-center text-color cursor-pointer">
              <Checkbox
                bind:checked={streamsPerms[selectedStream.id].topicPerms[selectedTopic.id][key]
                  .checked}
                value={''}
              />
              <span class="text-sm"
                >{streamsPerms[selectedStream.id].topicPerms[selectedTopic.id][key].name}</span
              >
            </label>
          {/each}
        </div>
      </div>
    {:else}
      <div class="absolute inset-0 flex items-start justify-center">
        <em class="italic dark:text-white block mt-[34px]"> This stream has no topics. </em>
      </div>
    {/if}
  </div>
</div>
