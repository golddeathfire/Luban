import fs from 'fs';
import path from 'path';
import { pathWithRandomSuffix } from '../../../shared/lib/random-utils';
import DataStorage from '../../DataStorage';
import { editorProcess } from '../../lib/editor/process';
import { LaserToolPathGenerator } from '../../lib/ToolPathGenerator';
import SVGParser from '../../../shared/lib/SVGParser';
import { parseDxf, dxfToSvg, updateDxfBoundingBox } from '../../../shared/lib/DXFParser/Parser';
import CncToolPathGenerator from '../../lib/ToolPathGenerator/CncToolPathGenerator';
import CncReliefToolPathGenerator from '../../lib/ToolPathGenerator/CncReliefToolPathGenerator';
import logger from '../../lib/logger';
import {
    PROCESS_MODE_GREYSCALE,
    PROCESS_MODE_VECTOR,
    SOURCE_TYPE_DXF,
    SOURCE_TYPE_IMAGE3D,
    SOURCE_TYPE_RASTER,
    SOURCE_TYPE_SVG,
    SOURCE_TYPE_TEXT
} from '../../constants';

const log = logger('service:TaskManager');

const generateLaserToolPath = async (modelInfo, onProgress) => {
    const suffix = '.json';
    // const { mode, source } = modelInfo;
    // const originFilename = source.filename;
    const { sourceType, mode, uploadName } = modelInfo;
    const outputFilename = pathWithRandomSuffix(path.parse(uploadName).name) + suffix;
    const outputFilePath = `${DataStorage.tmpDir}/${outputFilename}`;

    let modelPath = null;
    // no need to process model
    if (((sourceType === SOURCE_TYPE_SVG || sourceType === SOURCE_TYPE_DXF)
        && (mode === PROCESS_MODE_VECTOR))
        || (sourceType === SOURCE_TYPE_TEXT && mode === PROCESS_MODE_VECTOR)) {
        modelPath = `${DataStorage.tmpDir}/${uploadName}`;
    } else {
        // processImage: do "scale, rotate, greyscale/bw"
        const result = await editorProcess(modelInfo);
        modelPath = `${DataStorage.tmpDir}/${result.filename}`;
    }

    if (modelPath) {
        const generator = new LaserToolPathGenerator();
        generator.on('progress', (p) => {
            onProgress(p);
        });
        const toolPath = await generator.generateToolPathObj(modelInfo, modelPath);
        return new Promise((resolve, reject) => {
            fs.writeFile(outputFilePath, JSON.stringify(toolPath), 'utf8', (err) => {
                if (err) {
                    log.error(err);
                    reject(err);
                } else {
                    resolve({
                        filename: outputFilename
                    });
                }
            });
        });
    }

    return Promise.reject(new Error('No model found.'));
};

const generateCncToolPath = async (modelInfo, onProgress) => {
    const suffix = '.json';
    // const { mode, source } = modelInfo;
    // const originFilename = source.filename;
    const { sourceType, mode, uploadName, processImageName } = modelInfo;
    // const originFilename = uploadName;
    let modelPath = `${DataStorage.tmpDir}/${uploadName}`;
    const outputFilename = pathWithRandomSuffix(`${uploadName}.${suffix}`);
    const outputFilePath = `${DataStorage.tmpDir}/${outputFilename}`;

    if (((sourceType === 'svg' || sourceType === 'dxf') && (mode === 'vector' || mode === 'trace')) || (sourceType === 'text' && mode === 'vector')) {
        let toolPath;
        if (sourceType === 'dxf') {
            let { svg } = await parseDxf(modelPath);
            svg = dxfToSvg(svg);
            updateDxfBoundingBox(svg);

            const generator = new CncToolPathGenerator();
            generator.on('progress', (p) => onProgress(p));
            toolPath = await generator.generateToolPathObj(svg, modelInfo);
        } else {
            const svgParser = new SVGParser();
            const svg = await svgParser.parseFile(modelPath);

            const generator = new CncToolPathGenerator();
            generator.on('progress', (p) => onProgress(p));
            toolPath = await generator.generateToolPathObj(svg, modelInfo);
        }
        return new Promise((resolve, reject) => {
            fs.writeFile(outputFilePath, JSON.stringify(toolPath), 'utf8', (err) => {
                if (err) {
                    log.error(err);
                    reject(err);
                } else {
                    resolve({
                        filename: outputFilename
                    });
                }
            });
        });
    } else if (sourceType === SOURCE_TYPE_IMAGE3D && mode === PROCESS_MODE_GREYSCALE) {
        // image3d need use processImageName
        modelPath = `${DataStorage.tmpDir}/${processImageName}`;

        // TODO Parameters used twice resulted in no invert
        modelInfo.config.invert = false;

        const generator = new CncReliefToolPathGenerator(modelInfo, modelPath);
        generator.on('progress', (p) => onProgress(p));

        const toolPath = await generator.generateToolPathObj();

        return new Promise((resolve, reject) => {
            fs.writeFile(outputFilePath, JSON.stringify(toolPath), 'utf8', (err) => {
                if (err) {
                    log.error(err);
                    reject(err);
                } else {
                    resolve({
                        filename: outputFilename
                    });
                }
            });
        });
    } else if (sourceType === SOURCE_TYPE_RASTER && mode === PROCESS_MODE_GREYSCALE) {
        const generator = new CncReliefToolPathGenerator(modelInfo, modelPath);
        generator.on('progress', (p) => onProgress(p));

        const toolPath = await generator.generateToolPathObj();

        return new Promise((resolve, reject) => {
            fs.writeFile(outputFilePath, JSON.stringify(toolPath), 'utf8', (err) => {
                if (err) {
                    log.error(err);
                    reject(err);
                } else {
                    resolve({
                        filename: outputFilename
                    });
                }
            });
        });
    } else {
        return Promise.reject(new Error(`Unexpected params: type = ${sourceType} mode = ${mode}`));
    }
};

export const generateToolPath = (modelInfo, onProgress) => {
    if (!modelInfo) {
        return Promise.reject(new Error('modelInfo is empty.'));
    }

    const { headType } = modelInfo;
    if (headType === 'laser') {
        return generateLaserToolPath(modelInfo, onProgress);
    } else if (headType === 'cnc') {
        return generateCncToolPath(modelInfo, onProgress);
    } else {
        return Promise.reject(new Error(`Unsupported type: ${headType}`));
    }
};
