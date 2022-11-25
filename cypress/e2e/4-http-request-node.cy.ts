import { WorkflowsPage as WorkflowsPageClass } from '../pages/workflows';
import { WorkflowPage as WorkflowPageClass } from '../pages/workflow';

const WorkflowsPage = new WorkflowsPageClass();
const WorkflowPage = new WorkflowPageClass();

describe('HTTP Request node', () => {
	beforeEach(() => {
		cy.skipSetup();
	});

	it('should make a request with a URL and receive a response', () => {
		WorkflowsPage.actions.createWorkflowFromCard();
		WorkflowPage.actions.addInitialNodeToCanvas('Manual Trigger');
		WorkflowPage.actions.addNodeToCanvas('HTTP Request');
		WorkflowPage.actions.openNodeNdv('n8n-nodes-base.httpRequest');
		WorkflowPage.actions.typeIntoParameterInput('url', 'https://google.com');

		WorkflowPage.actions.executeNodeFromNdv();

		WorkflowPage.getters.ndvOutputPanel().contains('<!doctype html>');
	});
});
