import * as fs from 'fs';
import * as path from 'path';
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const loadSchemas = (schemaBaseDir: string) => {
    return fs.readdirSync(schemaBaseDir)
        .filter(dir => fs.statSync(path.join(schemaBaseDir, dir)).isDirectory())
        .map(dir => {
            const schemaPath = path.join(schemaBaseDir, dir, 'creator-identity-assertion.json');
            if (fs.existsSync(schemaPath)) {
                return {
                    version: dir,
                    schema: JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))
                };
            } else {
                throw new Error(`Schema file not found in directory ${dir}`);
            }
        });
};

const loadJsonFiles = (dir: string) => {
    return fs.readdirSync(dir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
            const filePath = path.join(dir, file);
            return {
                name: file,
                testCase: JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            };
        });
};

const schemaBaseDir = path.join(__dirname, '../schemas');
const schemas = loadSchemas(schemaBaseDir);

schemas.forEach(({ version, schema }) => {
    const datasetsDir = path.join(__dirname, `./${version}/testCases`);
    const datasets = loadJsonFiles(datasetsDir);

    const validate = ajv.compile(schema);

    describe("JSON Schema Validation", () => {
        datasets.forEach(({ name, testCase }) => {
            it(`should pass schema validation for ${name} because "${testCase.description}"`, () => {
                const valid = validate(testCase.vc);
                
                expect(valid).toBe(testCase.isValid);
                if (!testCase.isValid) {
                    expect(validate.errors.map(error => `${error.instancePath || "root"} ${error.message}`)).toStrictEqual(testCase.errors);
                }
            });
        });
    });
})
