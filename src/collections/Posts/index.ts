import type { CollectionConfig, JSONField } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Banner } from '../../blocks/Banner/config'
import { Code } from '../../blocks/Code/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from 'payload'

type JSONSchema = Exclude<JSONField['jsonSchema'], undefined>['schema'];
const filterSchema: JSONSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  definitions: {
    condition: {
      type: 'object',
      properties: {
        _int_eq: {
          type: 'object',
          additionalProperties: { type: 'integer' },
        },
        _str_in: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        _str_not_in: {
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        _str_eq: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        _bool_eq: {
          type: 'object',
          additionalProperties: { type: 'boolean' },
        },
        _str_not_eq: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        _int_in_range_exc: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              min: { type: 'integer' },
              max: { type: 'integer' },
            },
            anyOf: [{ required: ['min'] }, { required: ['max'] }],
            additionalProperties: false,
          },
        },
        _array_contains: {
          type: 'object',
          additionalProperties: {
            anyOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'integer' },
              { type: 'boolean' },
            ],
          },
        },
        _array_not_contains: {
          type: 'object',
          additionalProperties: {
            anyOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'integer' },
              { type: 'boolean' },
            ],
          },
        },
        _int_in_range_inc: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              min: { type: 'integer' },
              max: { type: 'integer' },
            },
            anyOf: [{ required: ['min'] }, { required: ['max'] }],
            additionalProperties: false,
          },
        },
        _is_null: {
          type: 'object',
          additionalProperties: { type: 'boolean' },
        },
        _is_not_null: {
          type: 'object',
          additionalProperties: { type: 'boolean' },
        },
        _days_from_now: {
          type: 'object',
          additionalProperties: { type: 'integer', minimum: 0 },
        },
        _or: {
          type: 'array',
          items: { $ref: '#/definitions/condition' },
        },
        _and: {
          type: 'array',
          items: { $ref: '#/definitions/condition' },
        },
      },
      additionalProperties: false,
    },
  },
  properties: {
    _or: {
      type: 'array',
      items: { $ref: '#/definitions/condition' },
    },
    _and: {
      type: 'array',
      items: { $ref: '#/definitions/condition' },
    },
  },
  additionalProperties: false,
};

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: data?.slug,
          collection: 'posts',
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: data?.slug as string,
        collection: 'posts',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: true,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'relatedPosts',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              filterOptions: ({ id }) => {
                return {
                  id: {
                    not_in: [id],
                  },
                }
              },
              hasMany: true,
              relationTo: 'posts',
            },
            {
              name: 'categories',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              hasMany: true,
              relationTo: 'categories',
            },
          ],
          label: 'Meta',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),

            MetaDescriptionField({}),
            PreviewField({
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'authors',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      hasMany: true,
      relationTo: 'users',
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedAuthors',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    slugField(),
    {
      name: 'criteria_json',
      type: 'json',
      jsonSchema: {
        uri: 'dummy://foo.json',
        fileMatch: ['dummy://foo.json'],
        schema: filterSchema,
      },
    },],
  hooks: {
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
