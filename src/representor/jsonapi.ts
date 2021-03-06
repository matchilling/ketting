import Link from '../link';
// import { resolve } from '../utils/url';
import Representation from './base';

/**
 * A JSON:API link can either be a string, or an object with at least a href
 * property.
 */
type JsonApiLink = string | { href: string };

/**
 * This type is a full 'links' object, which might appear on the top level
 * or on resource objects.
 */
type JsonApiLinksObject = {
  self?: JsonApiLink,
  profile?: JsonApiLink,
  [rel: string]: JsonApiLink | JsonApiLink[] | undefined
};

/**
 * This is a single JSON:API resource. Its type contains just the properties
 * we care about.
 */
type JsonApiResource = {
  type: string,
  id: string,
  links?: JsonApiLinksObject,
};


/**
 * This type represents a valid JSON:API response. We're only interested
 * in the links object at the moment, so everything else is (for now)
 * untyped.
 */
type JsonApiTopLevelObject = {
  links?: JsonApiLinksObject,
  data: JsonApiResource | JsonApiResource[] | null,
  [s: string]: any
};

/**
 * This class represents JSON:API responses.
 *
 * The Representor is responsible from extracting any links from the body,
 * so they can be followed.
 */
export default class JsonApi extends Representation<JsonApiTopLevelObject> {

  /**
   * Parse links.
   *
   * This function gets called once by this object to parse any in-document
   * links.
   */
  protected parseLinks(body: any): Link[] {

    return ([] as Link[]).concat(
      parseJsonApiLinks(this.uri, body),
      parseJsonApiCollection(this.uri, body)
    );

  }

  /**
   * parse is called to convert a HTTP response body string into the most
   * suitable internal body type.
   *
   * For JSON responses, usually this means calling JSON.parse() and returning
   * the result.
   */
  protected parse(body: string): JsonApiTopLevelObject {

    return JSON.parse(body);

  }

}

/**
 * This function takes a JSON:API object, and extracts the links property.
 */
function parseJsonApiLinks(baseHref: string, body: JsonApiTopLevelObject): Link[] {

  const result: Link[] = [];

  if (body.links === undefined) {
    return result;
  }

  for (const [rel, linkValue] of Object.entries(body.links)) {

    if (Array.isArray(linkValue)) {
      result.push(...linkValue.map( link => parseJsonApiLink(baseHref, rel, link)));
    } else {
      result.push(parseJsonApiLink(baseHref, rel, linkValue!));
    }

  }

  return result;

}

/**
 * Find collection members in JSON:API objects.
 *
 * A JSON:API top-level object might represent a collection that has 0 or more
 * members.
 *
 * Members of this collection should appear as an 'item' link to the parent.
 */
function parseJsonApiCollection(baseHref: string, body: JsonApiTopLevelObject): Link[] {

  if (!Array.isArray(body.data)) {
    // Not a collection
    return [];
  }

  const result: Link[] = [];
  for (const member of body.data) {

    if ('links' in member && 'self' in member.links!) {

      const selfLink = parseJsonApiLink(baseHref, 'self', member.links!.self!);
      result.push(new Link({
        context: baseHref,
        href: selfLink.href,
        rel: 'item'
      }));

    }
  }

  return result;

}

/**
 * This function takes a single link value from a JSON:API link object, and
 * returns a object of type Link
 */
function parseJsonApiLink(baseHref: string, rel: string, link: JsonApiLink): Link {

  return new Link({
    context: baseHref,
    rel,
    href: typeof link === 'string' ? link : link.href,
  });

}
