#!/usr/bin/env python3
"""Validate frontend-only fixtures with the shared read-only M2/M1 schemas."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
sys.dont_write_bytecode = True
FRONT = Path(__file__).resolve().parents[1]
CONTRACT = FRONT.parent / 'open-rule/docs/contracts/studio-m2'
spec = importlib.util.spec_from_file_location('m2_contract', CONTRACT / 'validate.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
fixtures = FRONT / 'dev/fixtures'
def schema(name):
    return module.bundle({'$ref': '#/$defs/' + name}, CONTRACT / 'schema/m2.schema.json')
tests = []
def add(name, data, target):
    tests.append({'label': name, 'instance': data, 'schema': schema(target), 'valid': True})
for name in ['risk-profile.provider.json','risk-profile-mock.provider.json','precision.provider.json']:
    add(name, module.load(fixtures / name), 'ProviderDocument')
for resource in module.load(fixtures / 'catalog.json'):
    add(resource['document']['factId'], resource, 'FactResource')
for scenario in module.load(fixtures / 'scenarios.json'):
    add(scenario['id']+' request', scenario['request'], 'FactSimulationRequest')
    add(scenario['id']+' response', module.load(fixtures / scenario['response']), 'ErrorBody' if scenario['httpStatus'] >= 400 else 'FactExecutionResult')
add('mock-test response', module.load(fixtures / 'mock-test.response.json'), 'MockTestResult')
add('mock-test request', module.load(fixtures / 'provider-mock-test.request.json'), 'MockTestRequest')
add('required facts', module.load(fixtures / 'order-admission.required-facts.json'), 'RequiredFactsResource')
java_home = os.environ.get('JAVA_HOME','/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home')
with tempfile.TemporaryDirectory(prefix='openrule-m2-frontend-schema-') as temp:
    directory = Path(temp)
    cp = directory / 'classpath.txt'
    subprocess.run(['mvn','-o','-q','-f',str(FRONT.parent/'open-rule/scripts/studio-m1-validation-pom.xml'),'dependency:build-classpath','-Dmdep.outputFile='+str(cp)],check=True)
    suite = directory / 'suite.json'
    suite.write_text(module.encode({'schemas':[],'tests':tests}))
    subprocess.run([java_home+'/bin/javac','-cp',cp.read_text().strip(),'-d',temp,str(CONTRACT/'checks/SchemaCheck.java')],check=True)
    subprocess.run([java_home+'/bin/java','-cp',temp+os.pathsep+cp.read_text().strip(),'SchemaCheck',str(suite)],check=True)
print('Frontend response fixtures conform to shared schemas; real integration NOT_RUN')
