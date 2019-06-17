import pick from 'lodash/pick';
import Project from '../models/project';
import createId from '../utils/createId';

// objectID().toHexString();
/**
 * This converts between a mongoose Project model
 * and the public API Project object properties
 *
 */
export function toApi(model) {
  return {
    id: model.id,
    name: model.name,
  };
}

/**
 * Transforms a tree of files matching the APIs DirectoryContents
 * format into the data structure stored in mongodb
 *
 * - flattens the tree into an array of file/folders
 * - each file/folder gets a generated BSON-ID
 * - each folder has a `children` array containing the IDs of it's children
 */
function transformFilesInner(files = {}, parentNode) {
  const allFiles = [];

  Object.entries(files).forEach(([name, params]) => {
    const id = createId();
    const isFolder = params.files != null;

    if (isFolder) {
      const folder = {
        _id: id,
        name,
        fileType: 'folder',
        children: [] // Initialise an empty folder
      };

      allFiles.push(folder);

      // The recursion will return a list of child files/folders
      // It will also push the child's id into `folder.children`
      allFiles.push(...transformFilesInner(params.files, folder));
    } else {
      const file = {
        _id: id,
        name,
        fileType: 'file'
      };

      if (typeof params.url === 'string') {
        file.url = params.url;
      } else if (typeof params.content === 'string') {
        file.content = params.content;
      } else {
        throw new Error('url or params must be supplied');
      }

      allFiles.push(file);
    }

    // Push this child's ID onto it's parent's list
    // of children
    if (parentNode != null) {
      parentNode.children.push(id);
    }
  });

  return allFiles;
}

export function transformFiles(files = {}) {
  const withRoot = {
    root: {
      files
    }
  };

  return transformFilesInner(withRoot);
}

/**
 * This converts between the public API's Project object
 * properties and a mongoose Project model
 *
 */
export function toModel(object) {
  let files = [];

  if (typeof object.files === 'object') {
    files = transformFiles(object.files);
  }

  const projectValues = pick(object, ['user', 'name', 'slug']);
  projectValues.files = files;

  return new Project(projectValues);
}
