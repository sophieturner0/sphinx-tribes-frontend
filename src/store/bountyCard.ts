import { makeAutoObservable, runInAction, computed, observable, action } from 'mobx';
import { TribesURL } from 'config';
import { useMemo } from 'react';
import { BountyCard } from './interface';
import { uiStore } from './ui';

interface FilterState {
  selectedFeatures: string[];
  timestamp: number;
}

export class BountyCardStore {
  bountyCards: BountyCard[] = [];
  currentWorkspaceId: string;
  loading = false;
  error: string | null = null;

  @observable selectedFeatures: string[] = [];

  constructor(workspaceId: string) {
    this.currentWorkspaceId = workspaceId;
    makeAutoObservable(this);
    this.loadWorkspaceBounties();
    this.restoreFilterState();
  }

  loadWorkspaceBounties = async (): Promise<void> => {
    const jwt = uiStore.meInfo?.tribe_jwt;

    if (!this.currentWorkspaceId || !jwt) {
      runInAction(() => {
        this.error = 'Missing workspace ID or authentication';
      });
      return;
    }

    try {
      runInAction(() => {
        this.loading = true;
        this.error = null;
      });

      const url = `${TribesURL}/gobounties/bounty-cards?workspace_uuid=${this.currentWorkspaceId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-jwt': jwt,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load bounties: ${response.statusText}`);
      }

      const data = (await response.json()) as BountyCard[] | null;

      // Fetch proof counts for each bounty
      const bountyCardsWithProofs = await Promise.all(
        (data || []).map(async (bounty: BountyCard) => {
          try {
            const proofsUrl = `${TribesURL}/gobounties/${bounty.id}/proofs`;
            const proofsResponse = await fetch(proofsUrl, {
              method: 'GET',
              headers: {
                'x-jwt': jwt,
                'Content-Type': 'application/json'
              }
            });

            if (!proofsResponse.ok) {
              return { ...bounty, pow: 0 };
            }

            const proofs = await proofsResponse.json();
            return {
              ...bounty,
              pow: Array.isArray(proofs) ? proofs.length : 0
            };
          } catch (error) {
            console.error(`Error fetching proofs for bounty ${bounty.id}:`, error);
            return { ...bounty, pow: 0 };
          }
        })
      );

      runInAction(() => {
        this.bountyCards = bountyCardsWithProofs.map((bounty: BountyCard) => ({
          ...bounty
        }));
      });
    } catch (error) {
      console.error('Error loading bounties:', error);
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'An unknown error occurred';
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  };

  switchWorkspace = async (newWorkspaceId: string): Promise<void> => {
    if (this.currentWorkspaceId === newWorkspaceId) return;

    runInAction(() => {
      this.currentWorkspaceId = newWorkspaceId;
      this.bountyCards = [];
    });

    await this.loadWorkspaceBounties();
  };

  @computed get todoItems() {
    return this.bountyCards.filter((card: BountyCard) => card.status === 'TODO');
  }

  @computed get assignedItems() {
    return this.bountyCards.filter((card: BountyCard) => card.status === 'IN_PROGRESS');
  }

  @computed get completedItems() {
    return this.bountyCards.filter((card: BountyCard) => card.status === 'COMPLETED');
  }

  @computed get paidItems() {
    return this.bountyCards.filter((card: BountyCard) => card.status === 'PAID');
  }

  @computed get reviewItems() {
    return this.bountyCards.filter((card: BountyCard) => card.status === 'IN_REVIEW');
  }

  @action
  saveFilterState() {
    sessionStorage.setItem(
      'bountyFilterState',
      JSON.stringify({
        selectedFeatures: this.selectedFeatures,
        timestamp: Date.now()
      })
    );
  }

  @action
  restoreFilterState() {
    const saved = sessionStorage.getItem('bountyFilterState');
    if (saved) {
      const state = JSON.parse(saved) as FilterState;
      runInAction(() => {
        this.selectedFeatures = state.selectedFeatures;
      });
    }
  }

  @action
  toggleFeature(featureId: string) {
    if (this.selectedFeatures.includes(featureId)) {
      this.selectedFeatures = this.selectedFeatures.filter((id: string) => id !== featureId);
    } else {
      this.selectedFeatures.push(featureId);
    }
    this.saveFilterState();
  }

  @action
  clearAllFilters() {
    this.selectedFeatures = [];
    sessionStorage.removeItem('bountyFilterState');
    this.saveFilterState();
  }

  @computed
  get filteredBountyCards() {
    if (this.selectedFeatures.length === 0) {
      return this.bountyCards;
    }

    return this.bountyCards.filter((card: BountyCard) => {
      const hasNoFeature = !card.features?.uuid;
      const isNoFeatureSelected = this.selectedFeatures.includes('no-feature');
      const hasSelectedFeature =
        card.features?.uuid && this.selectedFeatures.includes(card.features.uuid);

      if (hasNoFeature && isNoFeatureSelected) {
        return true;
      }

      if (hasSelectedFeature) {
        return true;
      }

      return false;
    });
  }

  @computed
  get hasCardsWithoutFeatures() {
    return this.bountyCards.some((card: BountyCard) => !card.features?.uuid);
  }
}

export const useBountyCardStore = (workspaceId: string) =>
  useMemo(() => new BountyCardStore(workspaceId), [workspaceId]);
